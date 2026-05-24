import { db } from '$lib/server/db';
import { usersTable } from '$lib/server/db/schema';
import { assert, validateAuth, validateForm } from '$lib/server/util';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';
import { deleteSecretSessionCookie } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	const locals = validateAuth(event);

	const [user] = await db
		.select()
		.from(usersTable)
		.where(eq(usersTable.id, locals.user.id))
		.limit(1);

	assert(user, 404, 'User not found');

	return {
		user: {
			...user,
			passwordHash: undefined,
			secretPinHash: undefined
		},
		hasPin: !!user.secretPinHash
	};
};

export const actions: Actions = {
	delete: async (event) => {
		const locals = validateAuth(event);
		await db.delete(usersTable).where(eq(usersTable.id, locals.user.id));
		redirect(302, '/login');
	},

	logout: async (event) => {
		validateAuth(event);
	},

	'set-pin': validateForm(
		z.object({
			pin: z.string().min(4).max(6),
			currentPin: z.string().optional()
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			const [userRecord] = await db
				.select({ secretPinHash: usersTable.secretPinHash })
				.from(usersTable)
				.where(eq(usersTable.id, locals.user.id))
				.limit(1);

			if (userRecord?.secretPinHash) {
				if (!form.currentPin) {
					return { success: false, error: 'Current PIN is required to change it' };
				}
				const validPin = await verify(userRecord.secretPinHash, form.currentPin, {
					memoryCost: 19456,
					timeCost: 2,
					outputLen: 32,
					parallelism: 1
				});
				if (!validPin) {
					return { success: false, error: 'Current PIN is incorrect' };
				}
			}

			const newPinHash = await hash(form.pin, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			await db
				.update(usersTable)
				.set({ secretPinHash: newPinHash })
				.where(eq(usersTable.id, locals.user.id));

			deleteSecretSessionCookie(event);

			return { success: true };
		}
	),

	'remove-pin': validateForm(
		z.object({
			currentPin: z.string().min(4).max(6)
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			const [userRecord] = await db
				.select({ secretPinHash: usersTable.secretPinHash })
				.from(usersTable)
				.where(eq(usersTable.id, locals.user.id))
				.limit(1);

			if (!userRecord?.secretPinHash) {
				return { success: false, error: 'No PIN is set' };
			}

			const validPin = await verify(userRecord.secretPinHash, form.currentPin, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			if (!validPin) {
				return { success: false, error: 'Current PIN is incorrect' };
			}

			await db
				.update(usersTable)
				.set({ secretPinHash: null })
				.where(eq(usersTable.id, locals.user.id));

			deleteSecretSessionCookie(event);

			return { success: true };
		}
	)
};
