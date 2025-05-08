import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { categoriesTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { corsHeaders, getCorsResponse, validateAuthHeader } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	const { user } = await validateAuthHeader(event);

	const categories = await db
		.select()
		.from(categoriesTable)
		.where(eq(categoriesTable.userId, user.id));

	return json({ categories }, { headers: corsHeaders });
};

export const OPTIONS: RequestHandler = getCorsResponse;
