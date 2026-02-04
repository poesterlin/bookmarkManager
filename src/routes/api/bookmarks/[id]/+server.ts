import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { corsHeaders, getCorsResponse, validateAuthHeader } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { bookmarksTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const DELETE: RequestHandler = async (event) => {
	const { user } = await validateAuthHeader(event);
	const { id } = event.params;

	// Verify the bookmark belongs to the user
	const bookmark = await db
		.select()
		.from(bookmarksTable)
		.where(and(eq(bookmarksTable.id, id), eq(bookmarksTable.userId, user.id)))
		.limit(1);

	if (bookmark.length === 0) {
		error(404, { message: 'Bookmark not found' });
	}

	// Delete the bookmark
	await db.delete(bookmarksTable).where(eq(bookmarksTable.id, id));

	return new Response(null, { headers: corsHeaders });
};

export const OPTIONS: RequestHandler = getCorsResponse;
