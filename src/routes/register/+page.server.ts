import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { generateId, validateForm, validatePassword, validateUsername } from '$lib/server/util';
import { hash } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { count } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}

	if (env.MAX_USER_COUNT) {
		const maxUserCount = parseInt(env.MAX_USER_COUNT, 10);
		const userCount = await numberOfUsers();

		if (userCount >= maxUserCount) {
			return redirect(302, '/login');
		}
	}

	return {};
};

async function numberOfUsers() {
	const [{ value }] = await db
		.select({
			value: count()
		})
		.from(table.usersTable);

	return value ?? 0;
}

const zEmptyStrToUndefined = z.preprocess((arg) => {
	if (typeof arg === 'string' && arg === '') {
		return undefined;
	} else {
		return arg;
	}
}, z.string().optional());

export const actions: Actions = {
	register: validateForm(
		z.object({
			username: z.string(),
			password: z.string(),
			email: zEmptyStrToUndefined,
			redirect: z.string().optional()
		}),
		async (event, form) => {
			if (env.MAX_USER_COUNT) {
				const maxUserCount = parseInt(env.MAX_USER_COUNT, 10);
				const userCount = await numberOfUsers();

				if (userCount >= maxUserCount) {
					return fail(400, { message: 'Oopsie! It looks like we have reached the maximum number of registered users. Please try again later! 😊' });
				}
			}

			const { username, password } = form;

			if (!validateUsername(username)) {
				return fail(400, {
					message:
						'Oopsie! It looks like your username needs a little more love. Please try again! 😊'
				});
			}
			if (!validatePassword(password)) {
				return fail(400, {
					message:
						'Oopsie! It looks like your password needs a little more love. Please try again! 😊'
				});
			}

			const userId = generateId();
			const passwordHash = await hash(password, {
				// recommended minimum parameters
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			try {
				await db.insert(table.usersTable).values({
					id: userId,
					email: form.email,
					createdAt: new Date(),
					lastLogin: new Date(),
					username,
					passwordHash
				});

				const sessionToken = auth.generateSessionToken();
				const session = await auth.createSession(sessionToken, userId);
				auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
			} catch (e) {
				console.error('Error creating user:', e);

				// handle PostgresError: duplicate key value violates unique constraint
				if (e instanceof Error && 'code' in e && e.code === '23505' && 'constraint' in e) {
					if (e.constraint === 'user_email_unique') {
						return fail(400, {
							message: 'Oopsie! It looks like this email is already in use. Please try again! 😊'
						});
					} else if (e.constraint === 'user_username_unique') {
						return fail(400, {
							message: 'Oopsie! It looks like this username is already in use. Please try again! 😊'
						});
					}
				}

				return fail(500, {
					message: 'Oopsie! It looks like something went wrong. Please try again! 😊'
				});
			}

			let to = '/';
			const redirectUrl = 'http://t' + form.redirect;
			try {
				const url = new URL(redirectUrl);
				to = url.searchParams.get('redirect') ?? '/';
			} catch {
				// ignore
			}

			return redirect(302, to);
		}
	)
};
