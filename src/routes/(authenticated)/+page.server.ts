import { db } from '$lib/server/db';
import {
	bookmarksTable,
	bookmarkTags,
	categoriesTable,
	tagsTable,
	type Category,
	type Tag
} from '$lib/server/db/schema';
import { generateId, validateAuth, validateForm } from '$lib/server/util';
import { error } from '@sveltejs/kit';
import { and, eq, exists, getTableColumns, inArray, isNotNull, isNull, not, sql } from 'drizzle-orm';
import {  z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const optionsSchema = z.object({
	category: z.string().optional(),
	favorite: z
		.string()
		.transform((val) => !val || val === 'true')
		.optional(),
	tag: z.string().optional(),
	archived: z
		.string()
		.transform((val) => !val || val === 'true')
		.optional()
});

export const load: PageServerLoad = async (event) => {
	const locals = validateAuth(event);

	const params = event.url.searchParams.entries();
	const search = Object.fromEntries(params);

	const options = optionsSchema.parse(search);

	const filters = [eq(bookmarksTable.userId, locals.user.id)];

	if (options.category) {
		filters.push(eq(bookmarksTable.category, options.category));
	}

	if (options.favorite) {
		filters.push(eq(bookmarksTable.isFavorite, options.favorite));
	}

	if (options.archived) {
		filters.push(isNotNull(bookmarksTable.deletedAt));
	} else {
		filters.push(isNull(bookmarksTable.deletedAt));
	}

	let filteredTag: Tag | undefined = undefined;

	if (options.tag) {
		const [t] = await db
			.select()
			.from(tagsTable)
			.where(and(eq(tagsTable.userId, locals.user.id), eq(tagsTable.id, options.tag)))
			.limit(1);
		if (!t) {
			error(400, 'tag not found');
		}
		filteredTag = t;

		filters.push(
			exists(
				db
					.select()
					.from(bookmarkTags)
					.where(
						and(eq(bookmarkTags.bookmarkId, bookmarksTable.id), eq(bookmarkTags.tagId, options.tag))
					)
			)
		);
	}

	const bookmarks = await db
		.select({
			...getTableColumns(bookmarksTable),
			tags: sql<
				Tag[]
			>`json_agg(json_build_object('id', ${tagsTable.id},'name', ${tagsTable.name}))`.as('tags'),
			category:
				sql<Category>`json_build_object('id', ${categoriesTable.id}, 'name', ${categoriesTable.name})`.as(
					'category'
				)
		})
		.from(bookmarksTable)
		.leftJoin(bookmarkTags, eq(bookmarksTable.id, bookmarkTags.bookmarkId))
		.leftJoin(tagsTable, eq(bookmarkTags.tagId, tagsTable.id))
		.leftJoin(categoriesTable, eq(bookmarksTable.category, categoriesTable.id))
		.groupBy(bookmarksTable.id, categoriesTable.id)
		.orderBy(bookmarksTable.clicks, bookmarksTable.createdAt)
		.where(and(...filters));

	const categories = await db
		.select()
		.from(categoriesTable)
		.where(eq(categoriesTable.userId, locals.user.id));

	const tags = await db
		.select({
			name: tagsTable.name
		})
		.from(tagsTable)
		.where(eq(tagsTable.userId, locals.user.id));

	return {
		user: locals.user,
		bookmarks,
		categories,
		tags: tags.map((tag) => tag.name),
		filteredTag
	};
};

export const actions: Actions = {
	add: validateForm(
		z.object({
			title: z.string().min(1).max(100),
			url: z.string().url(),
			categoryId: z.string().optional(),
			newCategory: z.string().optional(),
			tags: z
				.string()
				.optional()
				.transform((val) => val?.split(',') ?? []),
			description: z.string().optional(),
			theme: z.string().optional(),
			favicon: z.string().optional()
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			let categoryId: string | undefined = undefined;

			if (form.categoryId) {
				const [category] = await db
					.select()
					.from(categoriesTable)
					.where(
						and(eq(categoriesTable.userId, locals.user.id), eq(categoriesTable.id, form.categoryId))
					)
					.limit(1);

				if (!category) {
					throw new Error('Category not found');
				}

				categoryId = category.id;
			}

			await db.transaction(async (tx) => {
				if (form.newCategory) {
					const [category] = await db
						.select()
						.from(categoriesTable)
						.where(
							and(
								eq(categoriesTable.userId, locals.user.id),
								eq(categoriesTable.name, form.newCategory)
							)
						)
						.limit(1);

					if (category) {
						categoryId = category.id;
					} else {
						categoryId = generateId();

						await tx.insert(categoriesTable).values({
							id: categoryId,
							name: form.newCategory,
							userId: locals.user.id
						} satisfies typeof categoriesTable.$inferInsert);
					}
				}

				const id = generateId();
				await tx.insert(bookmarksTable).values({
					id,
					title: form.title,
					url: form.url,
					userId: locals.user.id,
					createdAt: new Date(),
					updatedAt: new Date(),
					category: categoryId,
					description: form.description,
					isFavorite: false,
					theme: form.theme,
					favicon: form.favicon
				} satisfies typeof bookmarksTable.$inferInsert);

				if (form.tags) {
					const existing = await db
						.select()
						.from(tagsTable)
						.where(and(eq(tagsTable.userId, locals.user.id), inArray(tagsTable.name, form.tags)));

					if (existing.length) {
						await tx.insert(bookmarkTags).values(
							existing.map((tag) => ({
								tagId: tag.id,
								bookmarkId: id
							}))
						);
					}

					const names = new Set(existing.map((tag) => tag.name));
					const newTags = form.tags.filter((tag) => !names.has(tag));

					if (newTags.length === 0) {
						return;
					}

					const newTagsIds = newTags.map(() => generateId());

					await tx.insert(tagsTable).values(
						newTags.map((tag, i) => ({
							id: newTagsIds[i],
							name: tag,
							userId: locals.user.id
						}))
					);

					await tx.insert(bookmarkTags).values(
						newTagsIds.map((tagId) => ({
							tagId,
							bookmarkId: id
						}))
					);
				}
			});
		}
	),
	delete: validateForm(
		z.object({
			id: z.string()
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			await db
				.delete(bookmarksTable)
				.where(and(eq(bookmarksTable.userId, locals.user.id), eq(bookmarksTable.id, form.id)));

			// Remove empty categories
			await db
				.delete(categoriesTable)
				.where(
					and(
						eq(categoriesTable.userId, locals.user.id),
						not(
							exists(
								db
									.select()
									.from(bookmarksTable)
									.where(eq(bookmarksTable.category, categoriesTable.id))
							)
						)
					)
				);
		}
	),
	archive: validateForm(
		z.object({
			id: z.string()
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			await db
				.update(bookmarksTable)
				.set({ deletedAt: new Date() })
				.where(and(eq(bookmarksTable.userId, locals.user.id), eq(bookmarksTable.id, form.id)));
		}
	),
	restore: validateForm(
		z.object({
			id: z.string()
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			await db
				.update(bookmarksTable)
				.set({ deletedAt: null })
				.where(and(eq(bookmarksTable.userId, locals.user.id), eq(bookmarksTable.id, form.id)));
		}
	),
	favorite: validateForm(
		z.object({
			id: z.string(),
			favorite: z.string().transform((val) => val === 'true')
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			await db
				.update(bookmarksTable)
				.set({ isFavorite: form.favorite })
				.where(and(eq(bookmarksTable.userId, locals.user.id), eq(bookmarksTable.id, form.id)));
		}
	)
};
