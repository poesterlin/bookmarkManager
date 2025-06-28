import { z } from 'zod';
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { corsHeaders, getCorsResponse, validateAuthHeader } from '$lib/server/auth';
import { createBookmark } from '$lib/server/bookmark';

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
