import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { bookmarkTags, tagsTable } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { corsHeaders, getCorsResponse, validateAuthHeader } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	const { user } = await validateAuthHeader(event);

	const tags = await db
		.select({
			name: tagsTable.name,
			id: tagsTable.id
		})
		.from(tagsTable)
		.innerJoin(bookmarkTags, eq(tagsTable.id, bookmarkTags.tagId))
		.groupBy(tagsTable.id)
		.where(and(eq(tagsTable.userId, user.id)))
		.orderBy(tagsTable.name);

	return json({ tags }, { headers: corsHeaders });
};

export const OPTIONS: RequestHandler = getCorsResponse;
