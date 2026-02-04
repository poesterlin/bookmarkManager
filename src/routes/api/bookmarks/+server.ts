import { z } from 'zod';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { corsHeaders, getCorsResponse, validateAuthHeader } from '$lib/server/auth';
import { createBookmark } from '$lib/server/bookmark';
import { db } from '$lib/server/db';
import { bookmarksTable, bookmarkTags, tagsTable, categoriesTable } from '$lib/server/db/schema';
import { eq, isNull, desc, getTableColumns, sql } from 'drizzle-orm';

const schema = z.object({
	title: z.string().min(1).max(500),
	url: z.string().url(),
	category: z.string().optional(),
	newCategory: z.string().optional(),
	tags: z
		.string()
		.optional()
		.transform((val) => val?.split(',') ?? []),
	description: z.string().optional(),
	theme: z.string().optional(),
	favicon: z.string().optional()
});

export const GET: RequestHandler = async (event) => {
	const { user } = await validateAuthHeader(event);

	const bookmarks = await db.select({
		...getTableColumns(bookmarksTable),
		tags: sql<any[]>`json_agg(json_build_object('id', ${tagsTable.id},'name', ${tagsTable.name})) FILTER (WHERE ${tagsTable.id} IS NOT NULL)`.as('tags'),
		category: sql<any>`json_build_object('id', ${categoriesTable.id}, 'name', ${categoriesTable.name})`.as('category')
	})
		.from(bookmarksTable)
		.leftJoin(bookmarkTags, eq(bookmarksTable.id, bookmarkTags.bookmarkId))
		.leftJoin(tagsTable, eq(bookmarkTags.tagId, tagsTable.id))
		.leftJoin(categoriesTable, eq(bookmarksTable.category, categoriesTable.id))
		.groupBy(bookmarksTable.id, categoriesTable.id)
		.orderBy(desc(bookmarksTable.createdAt))
		.where(eq(bookmarksTable.userId, user.id))
		.limit(100);

	return json({ bookmarks }, { headers: corsHeaders });
};

export const POST: RequestHandler = async (event) => {
	const { user } = await validateAuthHeader(event);

	const body = await event.request.json();
	const parsed = schema.safeParse(body);

	if (!parsed.success) {
		error(400, {
			message: 'Invalid input'
		});
	}

	await createBookmark(user, parsed.data);
	return new Response(null, { headers: corsHeaders });
};

export const OPTIONS: RequestHandler = getCorsResponse;
