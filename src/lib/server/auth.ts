import { error, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { timingSafeEqual } from 'node:crypto';
import { verify } from '@node-rs/argon2';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { pinLimiter } from '$lib/server/rate-limit';

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const SECRET_UNLOCK_MS = 1000 * 60 * 60 * 12;

export const argon2Options = {
	memoryCost: 19456,
	timeCost: 2,
	outputLen: 32,
	parallelism: 1
};

export const sessionCookieName = 'auth-session';
export const secretSessionCookieName = 'secret-session';

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

export async function createSession(token: string, userId: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: table.Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30)
	};
	await db.insert(table.sessionTable).values(session);
	return session;
}

export async function validateSessionToken(token: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await db
		.select({
			// Adjust user table here to tweak returned data
			user: { id: table.usersTable.id, username: table.usersTable.username },
			session: table.sessionTable
		})
		.from(table.sessionTable)
		.innerJoin(table.usersTable, eq(table.sessionTable.userId, table.usersTable.id))
		.where(eq(table.sessionTable.id, sessionId));

	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.sessionTable).where(eq(table.sessionTable.id, session.id));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.sessionTable)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.sessionTable.id, session.id));
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string) {
	await db.delete(table.sessionTable).where(eq(table.sessionTable.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: '/'
	});
}

export function setSecretSessionCookie(event: RequestEvent, token: string) {
	// session cookie, the token itself expires after SECRET_UNLOCK_MS
	event.cookies.set(secretSessionCookieName, token, {
		path: '/',
		sameSite: 'strict'
	});
}

export function deleteSecretSessionCookie(event: RequestEvent) {
	event.cookies.delete(secretSessionCookieName, {
		path: '/'
	});
}

function secretSignature(userId: string, pinHash: string, expiresAt: number) {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(`${userId}:${pinHash}:${expiresAt}`)));
}

/**
 * Token proving the PIN was entered. It is bound to the current PIN hash (changing the PIN
 * invalidates it) and expires after SECRET_UNLOCK_MS.
 */
export function createSecretSessionToken(userId: string, pinHash: string) {
	const expiresAt = Date.now() + SECRET_UNLOCK_MS;
	return `${expiresAt}.${secretSignature(userId, pinHash, expiresAt)}`;
}

export function validateSecretSessionToken(
	token: string,
	userId: string,
	pinHash: string | null
): boolean {
	if (!pinHash) return false;

	const [expiresAtRaw, signature] = token.split('.');
	const expiresAt = Number(expiresAtRaw);
	if (!signature || !Number.isSafeInteger(expiresAt) || Date.now() >= expiresAt) {
		return false;
	}

	const expected = Buffer.from(secretSignature(userId, pinHash, expiresAt));
	const actual = Buffer.from(signature);
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Verify a secret PIN with brute force protection. Returns an error message, or null when the
 * PIN is correct.
 */
export async function verifySecretPin(
	userId: string,
	pinHash: string,
	pin: string
): Promise<string | null> {
	const retryAfter = pinLimiter.retryAfter(userId);
	if (retryAfter > 0) {
		return `Too many wrong PINs. Try again in ${Math.ceil(retryAfter / 60)} minutes.`;
	}

	const valid = await verify(pinHash, pin, argon2Options);
	if (!valid) {
		pinLimiter.fail(userId);
		return 'Incorrect PIN';
	}

	pinLimiter.reset(userId);
	return null;
}

export async function isSecretUnlocked(event: RequestEvent, userId: string): Promise<boolean> {
	const secretToken = event.cookies.get(secretSessionCookieName);
	if (!secretToken || !userId) return false;

	const [userRecord] = await db
		.select({ secretPinHash: table.usersTable.secretPinHash })
		.from(table.usersTable)
		.where(eq(table.usersTable.id, userId))
		.limit(1);

	return validateSecretSessionToken(secretToken, userId, userRecord?.secretPinHash ?? null);
}

export async function validateAuthHeader(event: RequestEvent) {
	const [scheme, token] = event.request.headers.get('Authorization')?.split(' ') ?? [];
	if (scheme !== 'Bearer') {
		error(401, {
			message: 'Unauthorized'
		});
	}
	if (!token) {
		error(401, {
			message: 'Unauthorized'
		});
	}
	// validate token
	const result = await validateSessionToken(token);

	if (!result.user) {
		error(401, {
			message: 'Unauthorized'
		});
	}

	return result;
}

// Bearer token auth only: no credentials, so a wildcard origin is safe
export const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, DELETE',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export function getCorsResponse() {
	return new Response(null, {
		status: 200,
		headers: corsHeaders
	});
}
