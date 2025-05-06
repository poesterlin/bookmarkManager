import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bookmarkTags, tagsTable } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { validateAuth } from '$lib/server/util';

export const GET: RequestHandler = async (event) => {
	const locals = validateAuth(event);

	const tags = await db
		.select({
			name: tagsTable.name,
			id: tagsTable.id
		})
		.from(tagsTable)
		.innerJoin(bookmarkTags, eq(tagsTable.id, bookmarkTags.tagId))
		.groupBy(tagsTable.id)
		.where(and(eq(tagsTable.userId, locals.user.id)))
		.orderBy(tagsTable.name);

	return json({ tags });
};
