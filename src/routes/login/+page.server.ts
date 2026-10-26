import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	safeRedirectPath,
	validateForm,
	validatePassword,
	validateUsername
} from '$lib/server/util';
import { verify } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import { loginLimiter } from '$lib/server/rate-limit';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}

	return {};
};

export const actions: Actions = {
	login: validateForm(
		z.object({
			username: z.string(),
			password: z.string(),
			redirect: z.string().optional()
		}),
		async (event, form) => {
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

			const limiterKey = username.toLowerCase();
			const retryAfter = loginLimiter.retryAfter(limiterKey);
			if (retryAfter > 0) {
				return fail(429, {
					message: `Too many failed logins. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
				});
			}

			const results = await db
				.select()
				.from(table.usersTable)
				.where(eq(table.usersTable.username, username));

			const existingUser = results.at(0);
			if (!existingUser) {
				loginLimiter.fail(limiterKey);
				return fail(400, {
					message:
						"Oh no! We couldn't find that username or password. Please double-check and try again! 🌟"
				});
			}

			const validPassword = await verify(existingUser.passwordHash, password, auth.argon2Options);
			if (!validPassword) {
				loginLimiter.fail(limiterKey);
				return fail(400, {
					message:
						"Oh no! We couldn't find that username or password. Please double-check and try again! 🌟"
				});
			}

			loginLimiter.reset(limiterKey);

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, existingUser.id);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

			await db
				.update(table.usersTable)
				.set({ lastLogin: new Date() })
				.where(eq(table.usersTable.id, existingUser.id));

			return redirect(302, safeRedirectPath(form.redirect));
		}
	)
};
