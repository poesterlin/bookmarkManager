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

	const size = 32;
	const origin = new URL(bookmark.url).origin;
	const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=${size}`;

	const res = await fetch(url.toString(), { method: 'GET' });
	const clone = res.clone();
	if (!clone.ok) {
		return new Response('Failed to fetch favicon', { status: 404 });
	}
	clone.headers.set('Cache-Control', 'public, max-age=31536000, immutable');

	return clone;
};
