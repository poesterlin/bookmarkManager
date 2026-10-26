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

	if (!URL.canParse(bookmark.url)) {
		return new Response('Invalid bookmark URL', { status: 400 });
	}

	const size = 32;
	const origin = new URL(bookmark.url).origin;
	const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=${size}`;

	let res: Response;
	try {
		res = await fetch(url, { signal: AbortSignal.timeout(5000) });
	} catch {
		return new Response('Failed to fetch favicon', { status: 502 });
	}
	if (!res.ok) {
		return new Response('Failed to fetch favicon', { status: 404 });
	}

	// fetch() response headers are immutable, and forwarding them all would also pass on
	// content-encoding/length of the upstream response
	return new Response(res.body, {
		headers: {
			'Content-Type': res.headers.get('content-type') ?? 'image/png',
			// the endpoint needs auth, so only the browser may cache it
			'Cache-Control': 'private, max-age=604800'
		}
	});
};
