import { bookmarksTable } from '$lib/server/db/schema';
import { validateAuth } from '$lib/server/util';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async (event) => {
	const locals = validateAuth(event);
	const id = event.params.id;

	const [bookmark] = await db
		.select({
			url: bookmarksTable.url,
			favicon: bookmarksTable.favicon
		})
		.from(bookmarksTable)
		.where(and(eq(bookmarksTable.userId, locals.user.id), eq(bookmarksTable.id, id)))
		.limit(1);

	if (!bookmark) {
		return new Response('Bookmark not found', { status: 404 });
	}

	if (!bookmark.favicon) {
		return new Response('No favicon found', { status: 404 });
	}

	const url = new URL(bookmark.favicon, bookmark.url);

	const res = await fetch(url.toString(), { method: 'GET' });
	if (!res.ok) {
		return new Response(null, {
			status: 302,
			headers: {
				location: '/favicon.png'
			}
		});
	}

	return new Response(res.body, {
		status: res.status,
		headers: {
			'Content-Type': res.headers.get('Content-Type') ?? 'image/png',
			'Content-Length': res.headers.get('Content-Length') ?? '0',
			'Cache-Control': 'public, max-age=31536000, immutable',
		}
	});
};
