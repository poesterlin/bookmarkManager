import { db } from '$lib/server/db';
import { bookmarksTable, bookmarkTags, categoriesTable, sharedCategoriesTable, tagsTable, usersTable, type Category, type Tag } from '$lib/server/db/schema';
import { validateAuth, validateOptions } from '$lib/server/util';
import { error, redirect } from '@sveltejs/kit';
import { and, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const optionsSchema = z.object({
    token: z.string()
});

export const load: PageServerLoad = async (event) => {
    const locals = validateAuth(event);
    const { token } = validateOptions(event, optionsSchema);

    const [sharingCategory] = await db
        .select({
            ...getTableColumns(sharedCategoriesTable),
            owner: usersTable.username,
            name: categoriesTable.name,
        })
        .from(sharedCategoriesTable)
        .leftJoin(usersTable, eq(usersTable.id, sharedCategoriesTable.owner))
        .leftJoin(categoriesTable, eq(categoriesTable.id, sharedCategoriesTable.categoryId))
        .where(eq(sharedCategoriesTable.token, token))
        .limit(1);

    if (!sharingCategory) {
        error(404, 'Not found');
    }

    if (sharingCategory.userId === locals.user.id) {
        redirect(302, "/");
    }

    if (sharingCategory.userId) {
        error(400, "invalid token");
    }

    const bookmarks = await db.select({
        ...getTableColumns(bookmarksTable),
        tags: sql<Tag[]>`json_agg(json_build_object('name', ${tagsTable.name}))`
            .as('tags'),
        category: sql<Category> `json_build_object('name', ${categoriesTable.name})`
            .as('category'),
    })
        .from(bookmarksTable)
        .leftJoin(bookmarkTags, eq(bookmarksTable.id, bookmarkTags.bookmarkId))
        .leftJoin(tagsTable, eq(bookmarkTags.tagId, tagsTable.id))
        .leftJoin(categoriesTable, eq(bookmarksTable.category, categoriesTable.id))
        .groupBy(bookmarksTable.id, categoriesTable.id)
        .where(and(
            eq(categoriesTable.id, sharingCategory.categoryId),
            isNull(bookmarksTable.deletedAt)
        ))
        .limit(6);

    return {
        sharingCategory,
        bookmarks
    };
};

export const actions: Actions = {
    confirm: async (event) => {
        const locals = validateAuth(event);
        const { token } = validateOptions(event, optionsSchema);

        const [sharingCategory] = await db
            .select()
            .from(sharedCategoriesTable)
            .where(eq(sharedCategoriesTable.token, token));

        if (!sharingCategory) {
            error(404, 'Not found');
        }

        if (sharingCategory.userId !== locals.user.id) {
            await db
                .update(sharedCategoriesTable)
                .set({ userId: locals.user.id })
                .where(eq(sharedCategoriesTable.id, sharingCategory.id));
        }

        redirect(302, '/');
    }
};
