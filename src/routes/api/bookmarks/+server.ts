import { formatZodError } from '$lib/server/api';
import { corsHeaders, getCorsResponse, validateAuthHeader } from '$lib/server/auth';
import { createBookmark } from '$lib/server/bookmark';
import { parseTags } from '$lib/server/util';
import { db } from '$lib/server/db';
import { bookmarksTable, bookmarkTags, categoriesTable, tagsTable } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { and, desc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const schema = z.object({
	title: z.string().min(1).max(500),
	url: z.preprocess((v) => {
		const val = String(v ?? '').trim();
		if (val && !/^https?:\/\//i.test(val)) return `https://${val}`;
		return val;
	}, z.string().url()),
	category: z.string().optional(),
	newCategory: z.string().optional(),
	tags: z.string().optional().transform(parseTags),
	description: z.string().optional(),
	theme: z.string().optional(),
	favicon: z.string().optional()
});

export const GET: RequestHandler = async (event) => {
	const { user } = await validateAuthHeader(event);

	const bookmarks = await db
		.select({
			...getTableColumns(bookmarksTable),
			tags: sql<
				any[]
			>`coalesce(json_agg(json_build_object('id', ${tagsTable.id},'name', ${tagsTable.name})) FILTER (WHERE ${tagsTable.id} IS NOT NULL), '[]')`.as(
				'tags'
			),
			category:
				sql<any>`json_build_object('id', ${categoriesTable.id}, 'name', ${categoriesTable.name})`.as(
					'category'
				)
		})
		.from(bookmarksTable)
		.leftJoin(bookmarkTags, eq(bookmarksTable.id, bookmarkTags.bookmarkId))
		.leftJoin(tagsTable, eq(bookmarkTags.tagId, tagsTable.id))
		.leftJoin(categoriesTable, eq(bookmarksTable.category, categoriesTable.id))
		.groupBy(bookmarksTable.id, categoriesTable.id)
		.orderBy(desc(bookmarksTable.createdAt))
		.where(
			and(
				eq(bookmarksTable.userId, user.id),
				eq(bookmarksTable.isSecret, false),
				isNull(bookmarksTable.deletedAt)
			)
		)
		.limit(100);

	return json({ bookmarks }, { headers: corsHeaders });
};

export const POST: RequestHandler = async (event) => {
	const { user } = await validateAuthHeader(event);

	const body = await event.request.json().catch(() => null);
	const parsed = schema.safeParse(body);

	if (!parsed.success) {
		return json(formatZodError(parsed.error), { status: 400, headers: corsHeaders });
	}

	const result = await createBookmark(user, parsed.data);
	return json(result, { status: 201, headers: corsHeaders });
};

export const OPTIONS: RequestHandler = getCorsResponse;
