import { generateSessionToken } from '$lib/server/auth';
import { db } from '$lib/server/db';
import {
	bookmarksTable,
	categoriesTable,
	sharedCategoriesTable,
	usersTable
} from '$lib/server/db/schema';
import { generateId, validateAuth, validateForm } from '$lib/server/util';
import { error } from '@sveltejs/kit';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const locals = validateAuth(event);

	const [catergory] = await db
		.select()
		.from(categoriesTable)
		.where(and(eq(categoriesTable.userId, locals.user.id), eq(categoriesTable.id, event.params.id)))
		.limit(1);

	if (!catergory) {
		error(404, 'Not Found');
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
		.where(
			and(
				eq(sharedCategoriesTable.owner, locals.user.id),
				eq(sharedCategoriesTable.categoryId, event.params.id)
			)
		);

	const shares = await db
		.select()
		.from(sharedCategoriesTable)
		.where(eq(sharedCategoriesTable.categoryId, event.params.id));

	return { shared, catergory, shares };
};

export const actions: Actions = {
	'update-name': validateForm(
		z.object({ name: z.string().min(1, 'Collection name is required').max(255) }),
		async (event, form) => {
			const locals = validateAuth(event);

			const [category] = await db
				.select()
				.from(categoriesTable)
				.where(
					and(eq(categoriesTable.userId, locals.user.id), eq(categoriesTable.id, event.params.id))
				)
				.limit(1);

			if (!category) {
				error(404, 'Collection not found');
			}

			// Check for duplicate name
			const [duplicate] = await db
				.select()
				.from(categoriesTable)
				.where(
					and(
						eq(categoriesTable.userId, locals.user.id),
						eq(categoriesTable.name, form.name),
						// names only have to be unique among siblings
						category.parentId
							? eq(categoriesTable.parentId, category.parentId)
							: isNull(categoriesTable.parentId)
					)
				)
				.limit(1);

			if (duplicate && duplicate.id !== event.params.id) {
				error(400, 'A collection with this name already exists');
			}

			await db
				.update(categoriesTable)
				.set({ name: form.name })
				.where(eq(categoriesTable.id, event.params.id));
		}
	),

	'delete-collection': validateForm(
		z.object({
			deleteMode: z.enum(['collection-only', 'with-bookmarks']),
			bookmarkAction: z.enum(['uncategorize', 'archive', 'delete']).optional()
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			const [category] = await db
				.select()
				.from(categoriesTable)
				.where(
					and(eq(categoriesTable.userId, locals.user.id), eq(categoriesTable.id, event.params.id))
				)
				.limit(1);

			if (!category) {
				error(404, 'Collection not found');
			}

			// Check for active shares
			const shares = await db
				.select()
				.from(sharedCategoriesTable)
				.where(eq(sharedCategoriesTable.categoryId, event.params.id))
				.limit(1);

			if (shares.length > 0) {
				error(400, 'Cannot delete collection with active shares. Please revoke all shares first.');
			}

			// Sub-categories are deleted by the cascade together with their bookmarks, so the chosen
			// bookmark action has to cover them as well.
			const children = await db
				.select({ id: categoriesTable.id })
				.from(categoriesTable)
				.where(eq(categoriesTable.parentId, category.id));
			const categoryIds = [category.id, ...children.map((c) => c.id)];
			const inCollection = and(
				eq(bookmarksTable.userId, locals.user.id),
				inArray(bookmarksTable.category, categoryIds)
			);

			await db.transaction(async (tx) => {
				if (form.deleteMode === 'collection-only') {
					// Handle bookmarks based on user choice
					if (form.bookmarkAction === 'uncategorize') {
						// Set category to null for all bookmarks
						await tx
							.update(bookmarksTable)
							.set({ category: null, updatedAt: new Date() })
							.where(inCollection);
					} else if (form.bookmarkAction === 'archive') {
						// Soft delete by setting deletedAt
						await tx
							.update(bookmarksTable)
							.set({ deletedAt: new Date(), updatedAt: new Date() })
							.where(inCollection);
					} else if (form.bookmarkAction === 'delete') {
						// Hard delete bookmarks
						await tx.delete(bookmarksTable).where(inCollection);
					}
				} else {
					// with-bookmarks: delete all bookmarks
					await tx.delete(bookmarksTable).where(inCollection);
				}

				// Delete the category
				await tx.delete(categoriesTable).where(eq(categoriesTable.id, event.params.id));
			});
		}
	),
	revoke: validateForm(
		z.object({ id: z.string(), archive: z.string().transform((val) => val === 'true') }),
		async (event, form) => {
			const locals = validateAuth(event);

			const [sharingCategory] = await db
				.select()
				.from(sharedCategoriesTable)
				.innerJoin(categoriesTable, eq(categoriesTable.id, sharedCategoriesTable.categoryId))
				.where(
					and(
						eq(sharedCategoriesTable.owner, locals.user.id),
						eq(sharedCategoriesTable.id, form.id)
					)
				)
				.limit(1);

			if (!sharingCategory) {
				error(404, 'Not Found');
			}

			await db.transaction(async (tx) => {
				// get bookmarks that were created from this share
				const bookmarks = await tx
					.select()
					.from(bookmarksTable)
					.where(eq(bookmarksTable.fromShareId, form.id));

				if (bookmarks.length > 0 && sharingCategory.shared_categories.userId) {
					// The participant keeps their bookmarks: they are moved into a new category of
					// their own (tags stay, they belong to the participant).
					const newCategoryId = generateId();
					await tx.insert(categoriesTable).values({
						id: newCategoryId,
						userId: sharingCategory.shared_categories.userId,
						name: sharingCategory.categories.name
					});

					await tx
						.update(bookmarksTable)
						.set({
							fromShareId: null,
							updatedAt: new Date(),
							category: newCategoryId
						})
						.where(eq(bookmarksTable.fromShareId, form.id));

					// The collection keeps a copy owned by the collection owner, optionally archived.
					// Secret bookmarks were never visible to the owner and are not copied.
					const copies = bookmarks.filter((bookmark) => !bookmark.isSecret);
					if (copies.length > 0) {
						await tx.insert(bookmarksTable).values(
							copies.map((bookmark) => ({
								id: generateId(),
								userId: locals.user.id,
								category: sharingCategory.categories.id,
								url: bookmark.url,
								title: bookmark.title,
								description: bookmark.description,
								favicon: bookmark.favicon,
								theme: bookmark.theme,
								createdAt: bookmark.createdAt,
								updatedAt: new Date(),
								deletedAt: form.archive ? new Date() : bookmark.deletedAt,
								isSecret: false
							}))
						);
					}
				}

				await tx.delete(sharedCategoriesTable).where(eq(sharedCategoriesTable.id, form.id));
			});
		}
	),

	create: async (event) => {
		const locals = validateAuth(event);

		const [category] = await db
			.select()
			.from(categoriesTable)
			.where(
				and(eq(categoriesTable.userId, locals.user.id), eq(categoriesTable.id, event.params.id))
			);

		if (!category) {
			error(404, 'Not Found');
		}

		if (category.parentId) {
			error(400, 'Sub-categories cannot be shared');
		}

		await db.insert(sharedCategoriesTable).values({
			id: generateId(),
			token: generateSessionToken(),
			categoryId: category.id,
			owner: locals.user.id,
			allowWriteAccess: false
		});
	},
	'allow-write': validateForm(z.object({ id: z.string() }), async (event, form) => {
		const locals = validateAuth(event);

		const [sharingCategory] = await db
			.select()
			.from(sharedCategoriesTable)
			.where(
				and(eq(sharedCategoriesTable.owner, locals.user.id), eq(sharedCategoriesTable.id, form.id))
			)
			.limit(1);

		if (!sharingCategory) {
			error(404, 'Not Found');
		}

		await db
			.update(sharedCategoriesTable)
			.set({ allowWriteAccess: true })
			.where(eq(sharedCategoriesTable.id, form.id));
	}),
	'deny-write': validateForm(z.object({ id: z.string() }), async (event, form) => {
		const locals = validateAuth(event);

		const [sharingCategory] = await db
			.select()
			.from(sharedCategoriesTable)
			.where(
				and(eq(sharedCategoriesTable.owner, locals.user.id), eq(sharedCategoriesTable.id, form.id))
			)
			.limit(1);

		if (!sharingCategory) {
			error(404, 'Not Found');
		}

		await db
			.update(sharedCategoriesTable)
			.set({ allowWriteAccess: false })
			.where(eq(sharedCategoriesTable.id, form.id));
	})
};
