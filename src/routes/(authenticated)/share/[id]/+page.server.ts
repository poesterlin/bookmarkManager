import { generateSessionToken } from "$lib/server/auth";
import { db } from "$lib/server/db";
import { bookmarksTable, categoriesTable, sharedCategoriesTable, usersTable } from "$lib/server/db/schema";
import { generateId, validateAuth, validateForm } from "$lib/server/util";
import { error } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
    const locals = validateAuth(event);

    const [catergory] = await db
        .select()
        .from(categoriesTable)
        .where(and(
            eq(categoriesTable.userId, locals.user.id),
            eq(categoriesTable.id, event.params.id),
        ))
        .limit(1);

    if (!catergory) {
        error(404, "Not Found");
    }

    const shared = await db
        .select({
            id: sharedCategoriesTable.id,
            token: sharedCategoriesTable.token,
            username: usersTable.username,
            createdAt: sharedCategoriesTable.createdAt,
            allowWrites: sharedCategoriesTable.allowWriteAccess
        })
        .from(sharedCategoriesTable)
        .leftJoin(categoriesTable, eq(categoriesTable.id, sharedCategoriesTable.categoryId))
        .leftJoin(usersTable, eq(usersTable.id, sharedCategoriesTable.userId))
        .where(and(
            eq(sharedCategoriesTable.owner, locals.user.id),
            eq(sharedCategoriesTable.categoryId, event.params.id),
        ));

    return { shared, catergory };
};

export const actions: Actions = {
    "revoke": validateForm(z.object({ id: z.string(), archive: z.string().transform((val) => val === "true") }), async (event, form) => {
        const locals = validateAuth(event);

        const [sharingCategory] = await db
            .select()
            .from(sharedCategoriesTable)
            .where(and(
                eq(sharedCategoriesTable.owner, locals.user.id),
                eq(sharedCategoriesTable.id, form.id),
            )).limit(1);

        if (!sharingCategory) {
            error(404, "Not Found");
        }

        await db.transaction(async (tx) => {
            const bookmarks = await tx
                .select()
                .from(bookmarksTable)
                .where(eq(bookmarksTable.fromShareId, form.id));

            if (bookmarks.length > 0) {
                // add a copy to the creators bookmarks
                await tx
                    .insert(bookmarksTable)
                    .values(bookmarks.map(bookmark => ({
                        id: generateId(),
                        userId: bookmark.userId,
                        url: bookmark.url,
                        title: bookmark.title,
                        createdAt: bookmark.createdAt,
                        updatedAt: bookmark.updatedAt,
                    })));

                await tx
                    .update(bookmarksTable)
                    .set({
                        deletedAt: form.archive ? new Date() : null,
                        fromShareId: null,
                        userId: locals.user.id,
                        updatedAt: new Date()
                    })
                    .where(eq(bookmarksTable.fromShareId, form.id));
            }

            await tx.delete(sharedCategoriesTable).where(eq(sharedCategoriesTable.id, form.id));
        });
    }),

    "create": async (event) => {
        const locals = validateAuth(event);

        const [category] = await db
            .select()
            .from(categoriesTable)
            .where(and(
                eq(categoriesTable.userId, locals.user.id),
                eq(categoriesTable.id, event.params.id)
            ));

        if (!category) {
            error(404, "Not Found");
        }

        await db
            .insert(sharedCategoriesTable)
            .values({
                id: generateId(),
                token: generateSessionToken(),
                categoryId: category.id,
                owner: locals.user.id,
                allowWriteAccess: false,
            });
    },
    "allow-write": validateForm(z.object({ id: z.string() }), async (event, form) => {
        const locals = validateAuth(event);

        const [sharingCategory] = await db
            .select()
            .from(sharedCategoriesTable)
            .where(and(
                eq(sharedCategoriesTable.owner, locals.user.id),
                eq(sharedCategoriesTable.id, form.id),
            )).limit(1);

        if (!sharingCategory) {
            error(404, "Not Found");
        }

        await db
            .update(sharedCategoriesTable)
            .set({ allowWriteAccess: true })
            .where(eq(sharedCategoriesTable.id, form.id));
    }),
    "deny-write": validateForm(
        z.object({
            id: z.string(),
            archive: z.string().transform(val => val === 'on')
        }),
        async (event, form) => {
            const locals = validateAuth(event);

            const [sharingCategory] = await db
                .select()
                .from(sharedCategoriesTable)
                .where(and(
                    eq(sharedCategoriesTable.owner, locals.user.id),
                    eq(sharedCategoriesTable.id, form.id),
                )).limit(1);

            if (!sharingCategory) {
                error(404, "Not Found");
            }

            await db
                .update(sharedCategoriesTable)
                .set({ allowWriteAccess: false })
                .where(eq(sharedCategoriesTable.id, form.id));
        })
};