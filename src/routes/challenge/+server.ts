import { generateSessionToken } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { challengeTokenTable } from '$lib/server/db/schema';
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
export const POST: RequestHandler = async ({ locals }) => {
	// check if the user is already logged in, if so, do not create a new token
	if (locals.session) {
		return new Response(null, {
			status: 204, // No Content
			headers
		});
	}

	const [challenge] = await db
		.insert(challengeTokenTable)
		.values({
			id: generateSessionToken(),
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4) // 4 hours
		})
		.returning();

	// delete expired tokens
	await db.delete(challengeTokenTable).where(lt(challengeTokenTable.expiresAt, new Date()));

	return json({ token: challenge.id, expiresAt: challenge.expiresAt }, { headers, status: 201 });
};

export const OPTIONS: RequestHandler = auth.getCorsResponse;

// convert a claimed challenge token into a session token
export const GET: RequestHandler = async (event) => {
	const token = event.url.searchParams.get('token');
	if (!token) {
		return json({ error: 'No token provided' }, { status: 400, headers });
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

	if (!challenge || !challenge.userId) {
		return json({ error: 'Invalid token' }, { status: 400, headers });
	}

	const sessionToken = auth.generateSessionToken();
	const session = await auth.createSession(sessionToken, challenge.userId);
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
