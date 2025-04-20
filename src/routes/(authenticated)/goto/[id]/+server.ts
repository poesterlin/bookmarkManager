import { validateAuth } from '$lib/server/util';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bookmarksTable } from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const locals = validateAuth(event);
	const id = event.params.id;

	const [bookmark] = await db
		.update(bookmarksTable)
		.set({ clicks: sql`${bookmarksTable.clicks} + 1` })
		.where(and(eq(bookmarksTable.userId, locals.user.id), eq(bookmarksTable.id, id)))
		.returning();

	// redirect to the url
	if (!bookmark) {
		return new Response('Bookmark not found', { status: 404 });
	}

	const url = bookmark.url;
	if (!url) {
		return new Response('Invalid URL', { status: 400 });
	}

	return new Response(null, {
		status: 302,
		headers: {
			location: url
		}
	});
};
