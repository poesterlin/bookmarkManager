import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { categoriesTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { validateAuth } from '$lib/server/util';

export const GET: RequestHandler = async (event) => {
	const locals = validateAuth(event);

	const categories = await db
		.select()
		.from(categoriesTable)
		.where(eq(categoriesTable.userId, locals.user.id));

	return json({ categories });
};
