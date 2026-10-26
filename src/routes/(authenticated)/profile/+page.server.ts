import { db } from '$lib/server/db';
import { usersTable } from '$lib/server/db/schema';
import { assert, validateAuth, validateForm } from '$lib/server/util';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import { argon2Options, deleteSecretSessionCookie, verifySecretPin } from '$lib/server/auth';

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
			pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
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
				const pinError = await verifySecretPin(
					locals.user.id,
					userRecord.secretPinHash,
					form.currentPin
				);
				if (pinError) {
					return { success: false, error: pinError };
				}
			}

			const newPinHash = await hash(form.pin, argon2Options);

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

			const pinError = await verifySecretPin(
				locals.user.id,
				userRecord.secretPinHash,
				form.currentPin
			);
			if (pinError) {
				return { success: false, error: pinError };
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
