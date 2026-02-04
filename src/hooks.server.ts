import type { Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth.js';

const handleCors: Handle = async ({ event, resolve }) => {
	// Handle CORS preflight requests
	if (event.request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Max-Age': '86400'
			}
		});
	}

	const response = await resolve(event);

	// Add CORS headers to API responses
	if (event.url.pathname.startsWith('/api/')) {
		response.headers.set('Access-Control-Allow-Origin', '*');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	}

	return response;
};

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);
	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;

		const isHomePage = event.url.pathname === '/';
		if (isHomePage) {
			return Response.redirect(new URL('/intro', event.url), 302);
		}

		return resolve(event);
	}

	try {
		const { session, user } = await auth.validateSessionToken(sessionToken);
		if (session) {
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		} else {
			auth.deleteSessionTokenCookie(event);
		}

		event.locals.user = user;
		event.locals.session = session;
	} catch {
		// If session validation fails, clear session data but don't throw
		// This allows the request to proceed to error pages
		event.locals.user = null;
		event.locals.session = null;
		auth.deleteSessionTokenCookie(event);
	}

	return resolve(event);
};

export const handle: Handle = async (input) => {
	const corsResponse = await handleCors(input);
	if (corsResponse.status === 204) {
		return corsResponse;
	}
	return handleAuth(input);
};
