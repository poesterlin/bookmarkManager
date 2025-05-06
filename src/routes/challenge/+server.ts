import { generateSessionToken } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { challengeTokenTable } from '$lib/server/db/schema';
import { validateAuth } from '$lib/server/util';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq, gt, isNotNull, lt } from 'drizzle-orm';
import * as auth from '$lib/server/auth';

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

// create an anonymous challenge token
export const POST: RequestHandler = async () => {
	const [challenge] = await db
		.insert(challengeTokenTable)
		.values({
			id: generateSessionToken(),
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4) // 4 hours
		})
		.returning();

	// delete expired tokens
	await db.delete(challengeTokenTable).where(lt(challengeTokenTable.expiresAt, new Date()));

	return json({ token: challenge.id, expiresAt: challenge.expiresAt }, { headers });
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers
	});
};

// convert a claimed challenge token into a session token
export const GET: RequestHandler = async (event) => {
	const locals = validateAuth(event);
	const userId = locals.user.id;

	const token = event.url.searchParams.get('token');
	if (!token) {
		return json({ error: 'No token provided' }, { status: 400 });
	}

	const [challenge] = await db
		.select()
		.from(challengeTokenTable)
		.where(
			and(
				eq(challengeTokenTable.id, token),
				isNotNull(challengeTokenTable.userId),
				// Check if the token is not expired
				gt(challengeTokenTable.expiresAt, new Date())
			)
		)
		.limit(1);

	if (!challenge) {
		return json({ error: 'Invalid token' }, { status: 400 });
	}

	const sessionToken = auth.generateSessionToken();
	const session = await auth.createSession(sessionToken, userId);
	auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

	// delete token after use
	await db.delete(challengeTokenTable).where(eq(challengeTokenTable.id, token));

	return json(
		{
			token: sessionToken,
			expiresAt: session.expiresAt
		},
		{ headers }
	);
};
