import { createBookmark } from '$lib/server/bookmark';
import { db } from '$lib/server/db';
import {
	bookmarksTable,
	bookmarkTags,
	categoriesTable,
	sharedCategoriesTable,
	tagsTable,
	type Category,
	type Tag
} from '$lib/server/db/schema';
import { generateId, validateAuth, validateForm, validateOptions } from '$lib/server/util';
import { error, redirect } from '@sveltejs/kit';
import {
	and,
	asc,
	count,
	desc,
	eq,
	exists,
	getTableColumns,
	inArray,
	isNotNull,
	isNull,
	not,
	or,
	sql,
	SQL
} from 'drizzle-orm';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { alias } from 'drizzle-orm/pg-core';

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
		.optional(),

	// share target params
	title: z.string().optional(),
	text: z.string().optional(),
	link: z.string().optional(),
	order: z.string().optional().default('date-desc')
});

export const load: PageServerLoad = async (event) => {
	const locals = validateAuth(event);
	const options = validateOptions(event, optionsSchema);

	let filters = [] as SQL<any>[];

	let sharedCategory = undefined;
	if (options.category) {
		const [shared] = await db
			.select()
			.from(sharedCategoriesTable)
			.where(
				or(
					// try to find if its a category I am sharing
					and(
						eq(sharedCategoriesTable.categoryId, options.category),
						eq(sharedCategoriesTable.owner, locals.user.id),
					),
					// try to find a category that was shared with me
					and(
						eq(sharedCategoriesTable.id, options.category),
						eq(sharedCategoriesTable.userId, locals.user.id),
					)
				)
			)
			.limit(1);
		sharedCategory = shared;

		if (sharedCategory) {
			// reset user filter - shared categories show results from all users
			// Include bookmarks from the shared category and its children
			const childCategories = await db
				.select({ id: categoriesTable.id })
				.from(categoriesTable)
				.where(eq(categoriesTable.parentId, sharedCategory.categoryId));

			const categoryIds = [sharedCategory.categoryId, ...childCategories.map(c => c.id)];
			filters.push(inArray(bookmarksTable.category, categoryIds));
		} else {
			// Include bookmarks from the selected category and its children
			const childCategories = await db
				.select({ id: categoriesTable.id })
				.from(categoriesTable)
				.where(and(
					eq(categoriesTable.parentId, options.category),
					eq(categoriesTable.userId, locals.user.id)
				));

			const categoryIds = [options.category, ...childCategories.map(c => c.id)];
			filters.push(inArray(bookmarksTable.category, categoryIds));
		}
	} else if (!options.archived) {
		filters.push(isNull(bookmarksTable.fromShareId));
	}

	let filteredTag: Tag | undefined = undefined;
	if (options.tag) {
		const [tag] = await db
			.select()
			.from(tagsTable)
			.where(eq(tagsTable.id, options.tag))
			.limit(1);
		if (!tag) {
			error(400, 'tag not found');
		}
		filteredTag = tag;

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

	if (options.favorite) {
		filters.push(eq(bookmarksTable.isFavorite, options.favorite));
	}

	if (options.archived) {
		filters.push(isNotNull(bookmarksTable.deletedAt));
	} else {
		filters.push(isNull(bookmarksTable.deletedAt));
	}

	filters.push(eq(bookmarksTable.userId, locals.user.id));

	let order: any = bookmarksTable.createdAt;
	if (options.order === 'date-asc') {
		order = asc(bookmarksTable.createdAt);
	} else if (options.order === 'date-desc') {
		order = desc(bookmarksTable.createdAt);
	} else if (options.order === 'clicks-asc') {
		order = asc(bookmarksTable.clicks);
	} else if (options.order === 'clicks-desc') {
		order = desc(bookmarksTable.clicks);
	}

	const [bookmarks, categories, sharedCategories, tags] = await Promise.all([
		sharedCategory ?
			getSharedBookmarks(sharedCategory.categoryId, order, locals.user.id, options.archived) :
			getBookmarks(filters, order, locals.user.id),

		// categories
		db.select({
			...getTableColumns(categoriesTable),
			isShared: exists(
				db
					.select()
					.from(sharedCategoriesTable)
					.where(
						and(
							eq(sharedCategoriesTable.categoryId, categoriesTable.id),
							eq(sharedCategoriesTable.owner, locals.user.id)
						)
					)
			) as SQL<boolean>
		})
			.from(categoriesTable)
			.where(eq(categoriesTable.userId, locals.user.id))
			.orderBy(categoriesTable.parentId, categoriesTable.name),

		// shared categories
		db
			.select({ name: categoriesTable.name, id: sharedCategoriesTable.id, allowWriteAccess: sharedCategoriesTable.allowWriteAccess })
			.from(sharedCategoriesTable)
			.where(eq(sharedCategoriesTable.userId, locals.user.id))
			.innerJoin(categoriesTable, eq(categoriesTable.id, sharedCategoriesTable.categoryId)),

		// tags
		db
			.select({
				name: tagsTable.name,
				id: tagsTable.id,
				count: count(bookmarkTags.tagId),
			})
			.from(tagsTable)
			.innerJoin(bookmarkTags, eq(tagsTable.id, bookmarkTags.tagId))
			.innerJoin(bookmarksTable, eq(bookmarkTags.bookmarkId, bookmarksTable.id))
			.groupBy(tagsTable.id, bookmarkTags.tagId)
			.where(and(...filters))
			.orderBy(tagsTable.name)
	]);

	// sometimes share target text is used for the link, not the link property
	if (options.text && !options.link && URL.canParse(options.text)) {
		options.link = options.text;
		options.text = undefined;
	}

	return {
		user: locals.user,
		bookmarks,
		categories,
		sharedCategories,
		tags,
		filteredTag,
		shareTarget: {
			title: options.title,
			text: options.text,
			url: options.link
		}
	};
};

export const actions: Actions = {
	add: validateForm(
		z.object({
			title: z.string().min(1).max(500),
			url: z.string().url(),
			category: z.string().optional(),
			newCategory: z.string().optional(),
			parentCategoryId: z.string().optional(),
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
			await createBookmark(locals.user, form);
			redirect(302, '/');
		}
	),
	update: validateForm(
		z.object({
			id: z.string().min(1),
			url: z.string().url(),
			title: z.string().min(1).max(100),
			category: z.string().optional(),
			newCategory: z.string().optional(),
			parentCategoryId: z.string().optional(),
			tags: z
				.string()
				.optional()
				.transform((val) => val?.split(',').filter(Boolean) ?? []),
			description: z.string().optional()
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			// 1. Verify bookmark exists and belongs to user
			const [existingBookmark] = await db
				.select({ id: bookmarksTable.id })
				.from(bookmarksTable)
				.where(and(eq(bookmarksTable.userId, locals.user.id), eq(bookmarksTable.id, form.id)))
				.limit(1);

			if (!existingBookmark) {
				error(404, 'Bookmark not found or not owned by user');
			}

			// 2. Check if category exists and belongs to user
			if (form.category) {
				let [category] = await db
					.select({ id: categoriesTable.id })
					.from(categoriesTable)
					.where(
						and(eq(categoriesTable.userId, locals.user.id), eq(categoriesTable.id, form.category))
					)
					.limit(1);

				if (!category) {
					let sharedCategoryResults = await db
						.select({ id: sharedCategoriesTable.categoryId })
						.from(sharedCategoriesTable)
						.where(
							and(eq(sharedCategoriesTable.userId, locals.user.id), eq(sharedCategoriesTable.categoryId, form.category))
						)
						.limit(1);

					if (sharedCategoryResults.length > 0) {
						category = sharedCategoryResults[0];
					}

					if (!category) {
						error(404, 'Category not found or not owned by user');
					}
				}
			}

			await db.transaction(async (tx) => {
				let categoryId: string | null = null; // Use null to remove category

				if (form.newCategory) {
					// User wants to create/assign a new category
					const parentFilter = form.parentCategoryId
						? eq(categoriesTable.parentId, form.parentCategoryId)
						: isNull(categoriesTable.parentId);

					const [existingCategory] = await tx
						.select({ id: categoriesTable.id })
						.from(categoriesTable)
						.where(
							and(
								eq(categoriesTable.userId, locals.user.id),
								eq(categoriesTable.name, form.newCategory),
								parentFilter
							)
						)
						.limit(1);

					if (existingCategory) {
						categoryId = existingCategory.id;
					} else {
						categoryId = generateId();
						await tx.insert(categoriesTable).values({
							id: categoryId,
							name: form.newCategory,
							userId: locals.user.id,
							parentId: form.parentCategoryId || null
						});
					}
				} else if (form.category) {
					// User selected an existing category
					const [category] = await tx
						.select({ id: categoriesTable.id })
						.from(categoriesTable)
						.where(
							and(eq(categoriesTable.userId, locals.user.id), eq(categoriesTable.id, form.category))
						)
						.limit(1);

					if (category) {
						categoryId = category.id;
					} else {
						// Category ID provided but not found/valid for user
						// Set to null or throw error depending on desired behavior
						console.warn(
							`Update: Category ID ${form.category} not found for user ${locals.user.id}`
						);
						categoryId = null;
					}
				}
				// If neither newCategory nor category is provided, categoryId remains null

				// 3. Update Bookmark Details
				await tx
					.update(bookmarksTable)
					.set({
						url: form.url,
						title: form.title,
						description: form.description,
						category: categoryId, // Set determined categoryId or null
						updatedAt: new Date()
					})
					.where(and(eq(bookmarksTable.id, form.id), eq(bookmarksTable.userId, locals.user.id))); // Redundant user check, but safe

				// 4. Handle Tags (Delete old, add new)
				//    This is simpler than diffing for updates.

				// 4a. Delete existing tag associations for this bookmark
				await tx.delete(bookmarkTags).where(eq(bookmarkTags.bookmarkId, form.id));

				// 4b. Add new tag associations (logic reused from 'add')
				if (form.tags && form.tags.length > 0) {
					const existingDbTags = await tx
						.select()
						.from(tagsTable)
						.where(and(eq(tagsTable.userId, locals.user.id), inArray(tagsTable.name, form.tags)));

					const existingTagMap = new Map(existingDbTags.map((tag) => [tag.name, tag.id]));
					const tagsToInsert: Array<{ tagId: string; bookmarkId: string }> = [];
					const newTagsToCreate: Array<{ id: string; name: string; userId: string }> = [];

					for (const tagName of form.tags) {
						// Ensure tag name isn't empty after potential filtering issues
						if (!tagName) continue;

						if (existingTagMap.has(tagName)) {
							tagsToInsert.push({ tagId: existingTagMap.get(tagName)!, bookmarkId: form.id });
						} else {
							const newTagId = generateId();
							newTagsToCreate.push({ id: newTagId, name: tagName, userId: locals.user.id });
							tagsToInsert.push({ tagId: newTagId, bookmarkId: form.id });
							existingTagMap.set(tagName, newTagId); // Avoid duplicates in this transaction
						}
					}

					if (newTagsToCreate.length > 0) {
						await tx.insert(tagsTable).values(newTagsToCreate);
					}

					if (tagsToInsert.length > 0) {
						await tx.insert(bookmarkTags).values(tagsToInsert);
					}
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

			// Remove empty categories (no bookmarks and no children with bookmarks)
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
						),
						not(
							exists(
								(() => {
									const childCategories = alias(categoriesTable, 'child_categories');
									return db
										.select()
										.from(childCategories)
										.innerJoin(bookmarksTable, eq(bookmarksTable.category, childCategories.id))
										.where(eq(childCategories.parentId, categoriesTable.id));
								})()
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

			const [bookmark] = await db
				.select({ id: bookmarksTable.id, userId: bookmarksTable.userId, category: bookmarksTable.category })
				.from(bookmarksTable)
				.where(eq(bookmarksTable.id, form.id))
				.limit(1);

			if (!bookmark) {
				error(404, 'Bookmark not found');
			}

			const isOwner = bookmark.userId === locals.user.id;

			if (!isOwner) {
				// Check if the user is the admin of the shared category containing this bookmark
				const [sharedCategory] = bookmark.category ? await db
					.select()
					.from(sharedCategoriesTable)
					.where(and(
						eq(sharedCategoriesTable.owner, locals.user.id),
						eq(sharedCategoriesTable.categoryId, bookmark.category)
					))
					.limit(1) : [];

				if (!sharedCategory) {
					error(403, 'Not allowed');
				}

				// Foreign user's bookmark: archive and disconnect from the collection
				await db
					.update(bookmarksTable)
					.set({ deletedAt: new Date(), category: null, fromShareId: null })
					.where(eq(bookmarksTable.id, form.id));
			} else {
				await db
					.update(bookmarksTable)
					.set({ deletedAt: new Date() })
					.where(eq(bookmarksTable.id, form.id));
			}
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
	),
	"update-category": validateForm(
		z.object({
			category: z.string(),
			bookmark: z.string(),
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			const [bookmark] = await db
				.select()
				.from(bookmarksTable)
				.where(and(
					eq(bookmarksTable.userId, locals.user.id),
					eq(bookmarksTable.id, form.bookmark)
				)).limit(1);

			if (!bookmark) {
				error(404, { message: "Bookmark not found" });
			}

			let [category] = await db
				.select({ id: categoriesTable.id })
				.from(categoriesTable)
				.where(and(
					eq(categoriesTable.userId, locals.user.id),
					eq(categoriesTable.id, form.category)
				)).limit(1);

			if (!category) {
				let [sharedCategory] = await db
					.select({ categoryId: sharedCategoriesTable.categoryId, allowWriteAccess: sharedCategoriesTable.allowWriteAccess })
					.from(sharedCategoriesTable)
					.where(
						and(eq(sharedCategoriesTable.userId, locals.user.id), eq(sharedCategoriesTable.id, form.category))
					)
					.limit(1);

				if (sharedCategory) {
					if (!sharedCategory.allowWriteAccess) {
						error(403, 'You do not have write access to this collection');
					}
					category = { id: sharedCategory.categoryId };
				}

				if (!category) {
					error(404, 'Category not found or not owned by user');
				}
			}

			await db.update(bookmarksTable).set({
				category: category.id,
				updatedAt: new Date(),
			}).where(eq(bookmarksTable.id, form.bookmark));
		}
	),
};

/**
 * Get shared bookmarks for a specific category. This will be shown to the user the category is shared with as well as the owner of the category.
 */
async function getSharedBookmarks(categoryId: string, order: SQL<unknown>, userId: string, showArchived?: boolean) {
	const childCategories = await db
		.select({ id: categoriesTable.id })
		.from(categoriesTable)
		.where(eq(categoriesTable.parentId, categoryId));

	const categoryIds = [categoryId, ...childCategories.map(c => c.id)];

	return db.select({
		...getTableColumns(bookmarksTable),
		tags: sql<Tag[]>`json_agg(json_build_object('name', ${tagsTable.name}))`
			.as('tags'),
		category: sql<Category> `json_build_object('name', ${categoriesTable.name})`
			.as('category'),
		canEdit: sql<boolean>`${bookmarksTable.userId} = ${userId}`,
		canArchive: sql<boolean>`${bookmarksTable.userId} = ${userId} OR ${exists(
			db.select().from(sharedCategoriesTable).where(and(
				eq(sharedCategoriesTable.owner, userId),
				eq(sharedCategoriesTable.categoryId, categoriesTable.id)
			))
		)}`,
	})
		.from(bookmarksTable)
		.leftJoin(bookmarkTags, eq(bookmarksTable.id, bookmarkTags.bookmarkId))
		.leftJoin(tagsTable, eq(bookmarkTags.tagId, tagsTable.id))
		.leftJoin(categoriesTable, eq(bookmarksTable.category, categoriesTable.id))
		.groupBy(bookmarksTable.id, categoriesTable.id)
		.orderBy(order)
		.where(and(
			inArray(categoriesTable.id, categoryIds),
			showArchived ? isNotNull(bookmarksTable.deletedAt) : isNull(bookmarksTable.deletedAt)
		));
}

/**
 * Get all bookmarks for a user. Does not include shared category bookmarks.
 */
function getBookmarks(filters: SQL<unknown>[], order: SQL<unknown>, userId: string) {
	return db.select({
		...getTableColumns(bookmarksTable),
		tags: sql<
			Tag[]
		> `json_agg(json_build_object('id', ${tagsTable.id},'name', ${tagsTable.name}, 'shared', ${tagsTable.userId} != ${userId}))`.as('tags'),
		category: sql<Category> `json_build_object('id', ${categoriesTable.id}, 'name', ${categoriesTable.name})`.as(
			'category'
		),
		canEdit: sql<boolean>`${bookmarksTable.userId} = ${userId}`,
		canArchive: sql<boolean>`true`
	})
		.from(bookmarksTable)
		.leftJoin(bookmarkTags, eq(bookmarksTable.id, bookmarkTags.bookmarkId))
		.leftJoin(tagsTable, eq(bookmarkTags.tagId, tagsTable.id))
		.leftJoin(categoriesTable, eq(bookmarksTable.category, categoriesTable.id))
		.groupBy(bookmarksTable.id, categoriesTable.id)
		.orderBy(order)
		.where(and(...filters));
}

