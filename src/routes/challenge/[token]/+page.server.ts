import { db } from '$lib/server/db';
import { challengeTokenTable } from '$lib/server/db/schema';
import { validateAuth } from '$lib/server/util';
import { error, json, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { and, eq, gt, isNull } from 'drizzle-orm';

// claim a challenge token
export const load: PageServerLoad = async (event) => {
	const locals = validateAuth(event);
	const userId = locals.user.id;

	const token = event.params.token;
	if (!token) {
		return error(400, { message: 'No token provided' });
	}

	const [challenge] = await db
		.select()
		.from(challengeTokenTable)
		.where(
			and(
				eq(challengeTokenTable.id, token),
				isNull(challengeTokenTable.userId),
				// Check if the token is not expired
				gt(challengeTokenTable.expiresAt, new Date())
			)
		)
		.limit(1);

	if (!challenge) {
		return json({ error: 'Invalid token' }, { status: 400 });
	}

	await db
		.update(challengeTokenTable)
		.set({ userId })
		.where(eq(challengeTokenTable.id, challenge.id));

	redirect(302, '/');
};
