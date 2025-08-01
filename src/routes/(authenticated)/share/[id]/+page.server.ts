import { db } from "$lib/server/db";
import { categoriesTable, sharedCategoriesTable, usersTable } from "$lib/server/db/schema";
import { generateId, validateAuth, validateForm } from "$lib/server/util";
import { error, redirect } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { generateSessionToken } from "$lib/server/auth";

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
    "revoke": validateForm(z.object({ id: z.string() }), async (event, form) => {
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

        await db.delete(sharedCategoriesTable).where(eq(sharedCategoriesTable.id, form.id));
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
    }
};