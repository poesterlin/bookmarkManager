import { db } from '$lib/server/db';
import {
	bookmarksTable,
	bookmarkTags,
	categoriesTable,
	tagsTable,
	type Category,
	type Tag
} from '$lib/server/db/schema';
import { validateAuth } from '$lib/server/util';
import { json } from '@sveltejs/kit';
import { and, eq, getTableColumns, or, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const locals = validateAuth(event);
	const searchTerm = event.url.searchParams.get('query');

	if (!searchTerm) {
		return new Response('Bad Request', { status: 400 });
	}

	const results = await db
		.select({
			...getTableColumns(bookmarksTable),
			tags: sql<
				Tag[]
			>`json_agg(json_build_object('id', ${tagsTable.id},'name', ${tagsTable.name}))`.as('tags'),
			category:
				sql<Category>`json_build_object('id', ${categoriesTable.id}, 'name', ${categoriesTable.name})`.as(
					'category'
				)
		})
		.from(bookmarksTable)
		.where(
			and(
				or(
					sql`similarity(${bookmarksTable.title}, ${searchTerm}) > 0.05`,
					sql`similarity(${bookmarksTable.description}, ${searchTerm}) > 0.08`
				),
				eq(bookmarksTable.userId, locals.user.id)
			)
		)
		.leftJoin(bookmarkTags, eq(bookmarksTable.id, bookmarkTags.bookmarkId))
		.leftJoin(tagsTable, eq(bookmarkTags.tagId, tagsTable.id))
		.leftJoin(categoriesTable, eq(bookmarksTable.category, categoriesTable.id))
		.groupBy(bookmarksTable.id, categoriesTable.id)
		.orderBy(
			sql`similarity(${bookmarksTable.title}, ${searchTerm}) + similarity(${bookmarksTable.description}, ${searchTerm}) DESC`
		)
		.limit(20);

	return json(results);
};
