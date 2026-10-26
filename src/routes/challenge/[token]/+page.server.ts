import { db } from '$lib/server/db';
import { challengeTokenTable } from '$lib/server/db/schema';
import { validateAuth } from '$lib/server/util';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { and, eq, gt, isNull } from 'drizzle-orm';

async function findOpenChallenge(token: string) {
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

	return challenge;
}

// Show a confirmation page. Claiming must be an explicit POST: otherwise anyone could create a
// challenge, send the link to a logged-in user and redeem it for that user's session.
export const load: PageServerLoad = async (event) => {
	const locals = validateAuth(event);

	const challenge = await findOpenChallenge(event.params.token);
	if (!challenge) {
		error(400, 'Invalid or expired token');
	}

	return { user: locals.user, expiresAt: challenge.expiresAt };
};

export const actions: Actions = {
	// claim a challenge token
	default: async (event) => {
		const locals = validateAuth(event);

		const [claimed] = await db
			.update(challengeTokenTable)
			.set({ userId: locals.user.id })
			.where(
				and(
					eq(challengeTokenTable.id, event.params.token),
					isNull(challengeTokenTable.userId),
					gt(challengeTokenTable.expiresAt, new Date())
				)
			)
			.returning({ id: challengeTokenTable.id });

		if (!claimed) {
			error(400, 'Invalid or expired token');
		}

		redirect(302, '/');
	}
};
