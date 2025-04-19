import { validateAuth } from '$lib/server/util';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const locals = validateAuth(event);

	return { user: locals.user };
};

export const actions: Actions = {};
