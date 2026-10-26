import { createBookmark, findOrCreateCategory, resolveCategory } from '$lib/server/bookmark';
import { db } from '$lib/server/db';
import {
	bookmarksTable,
	bookmarkTags,
	categoriesTable,
	sharedCategoriesTable,
	tagsTable,
	usersTable,
	type Category,
	type Tag
} from '$lib/server/db/schema';
import {
	generateId,
	parseTags,
	validateAuth,
	validateForm,
	validateOptions
} from '$lib/server/util';
import * as auth from '$lib/server/auth';
import { error, redirect, fail } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
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
	secret: z
		.string()
		.transform((val) => val === 'true')
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

	let sharedCategory:
		| { id: string; categoryId: string; owner: string; selectedCategoryId: string }
		| undefined = undefined;
	if (options.category) {
		const [shared] = await db
			.select({
				id: sharedCategoriesTable.id,
				categoryId: sharedCategoriesTable.categoryId,
				owner: sharedCategoriesTable.owner,
				selectedCategoryId: sharedCategoriesTable.categoryId
			})
			.from(sharedCategoriesTable)
			.where(
				or(
					// try to find if its a category I am sharing
					and(
						eq(sharedCategoriesTable.categoryId, options.category),
						eq(sharedCategoriesTable.owner, locals.user.id)
					),
					// try to find a category that was shared with me
					and(
						eq(sharedCategoriesTable.id, options.category),
						eq(sharedCategoriesTable.userId, locals.user.id)
					)
				)
			)
			.limit(1);
		sharedCategory = shared;

		if (!sharedCategory) {
			const [sharedSubCategory] = await db
				.select({
					id: sharedCategoriesTable.id,
					categoryId: sharedCategoriesTable.categoryId,
					owner: sharedCategoriesTable.owner,
					selectedCategoryId: categoriesTable.id
				})
				.from(sharedCategoriesTable)
				.innerJoin(categoriesTable, eq(categoriesTable.parentId, sharedCategoriesTable.categoryId))
				.where(
					and(
						eq(sharedCategoriesTable.userId, locals.user.id),
						eq(categoriesTable.id, options.category)
					)
				)
				.limit(1);
			sharedCategory = sharedSubCategory;
		}

		if (sharedCategory) {
			filters.push(eq(bookmarksTable.category, sharedCategory.selectedCategoryId));
		} else {
			filters.push(eq(bookmarksTable.category, options.category));
		}
	} else if (!options.archived) {
		filters.push(isNull(bookmarksTable.fromShareId));
	}

	let filteredTag: Tag | undefined = undefined;
	if (options.tag) {
		const [tag] = await db.select().from(tagsTable).where(eq(tagsTable.id, options.tag)).limit(1);
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

	if (options.secret) {
		if (!locals.secretUnlocked) {
			error(403, 'Secret bookmarks are locked');
		}
		filters.push(eq(bookmarksTable.isSecret, true));
	}

	filters.push(eq(bookmarksTable.userId, locals.user.id));

	if (!locals.secretUnlocked) {
		filters.push(eq(bookmarksTable.isSecret, false));
	}

	const [userRecord] = await db
		.select({ secretPinHash: usersTable.secretPinHash })
		.from(usersTable)
		.where(eq(usersTable.id, locals.user.id))
		.limit(1);
	const hasPin = !!userRecord?.secretPinHash;

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

	const [bookmarks, categories, sharedCategories, sharedSubcategories, tags] = await Promise.all([
		sharedCategory
			? getSharedBookmarks(
					sharedCategory.selectedCategoryId,
					order,
					locals.user.id,
					sharedCategory.owner,
					locals.secretUnlocked,
					options.archived,
					options.tag
				)
			: getBookmarks(filters, order, locals.user.id),

		// categories
		db
			.select({
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
			.select({
				name: categoriesTable.name,
				id: sharedCategoriesTable.id,
				categoryId: sharedCategoriesTable.categoryId,
				allowWriteAccess: sharedCategoriesTable.allowWriteAccess
			})
			.from(sharedCategoriesTable)
			.where(eq(sharedCategoriesTable.userId, locals.user.id))
			.innerJoin(categoriesTable, eq(categoriesTable.id, sharedCategoriesTable.categoryId)),

		db
			.select({
				id: categoriesTable.id,
				name: categoriesTable.name,
				shareId: sharedCategoriesTable.id
			})
			.from(sharedCategoriesTable)
			.innerJoin(categoriesTable, eq(categoriesTable.parentId, sharedCategoriesTable.categoryId))
			.where(eq(sharedCategoriesTable.userId, locals.user.id))
			.orderBy(categoriesTable.name),

		// tags
		db
			.select({
				name: tagsTable.name,
				id: tagsTable.id,
				count: count(bookmarkTags.tagId)
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
		sharedSubcategories,
		tags,
		filteredTag,
		secretUnlocked: locals.secretUnlocked,
		hasPin,
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
			url: z.preprocess((v) => {
				const val = String(v ?? '').trim();
				if (val && !/^https?:\/\//i.test(val)) return `https://${val}`;
				return val;
			}, z.string().url()),
			category: z.string().optional(),
			newCategory: z.string().optional(),
			parentCategoryId: z.string().optional(),
			tags: z.string().optional().transform(parseTags),
			description: z.string().optional(),
			theme: z.string().optional(),
			favicon: z.string().optional(),
			isSecret: z
				.string()
				.optional()
				.transform((val) => val === 'true')
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
			url: z.preprocess((v) => {
				const val = String(v ?? '').trim();
				if (val && !/^https?:\/\//i.test(val)) return `https://${val}`;
				return val;
			}, z.string().url()),
			title: z.string().min(1).max(500),
			category: z.string().optional(),
			newCategory: z.string().optional(),
			parentCategoryId: z.string().optional(),
			tags: z.string().optional().transform(parseTags),
			description: z.string().optional(),
			isSecret: z
				.string()
				.optional()
				.transform((val) => val === 'true')
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

			// 2. Resolve the target category. Shared collections are referenced by their share id.
			let categoryId: string | null = null;
			let fromShareId: string | null = null;
			const newCategory = form.newCategory?.trim();
			if (newCategory) {
				categoryId = await findOrCreateCategory(locals.user, newCategory, form.parentCategoryId);
			} else if (form.category) {
				({ categoryId, fromShareId } = await resolveCategory(locals.user, form.category));
			}

			await db.transaction(async (tx) => {
				// 3. Update Bookmark Details
				await tx
					.update(bookmarksTable)
					.set({
						url: form.url,
						title: form.title,
						description: form.description,
						category: categoryId,
						fromShareId,
						updatedAt: new Date(),
						isSecret: form.isSecret ?? false
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
			await db.delete(categoriesTable).where(
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
				.select({
					id: bookmarksTable.id,
					userId: bookmarksTable.userId,
					category: bookmarksTable.category
				})
				.from(bookmarksTable)
				.where(eq(bookmarksTable.id, form.id))
				.limit(1);

			if (!bookmark) {
				error(404, 'Bookmark not found');
			}

			const isOwner = bookmark.userId === locals.user.id;

			if (!isOwner) {
				// Check if the user is the admin of the shared category containing this bookmark
				const [sharedCategory] = bookmark.category
					? await db
							.select()
							.from(sharedCategoriesTable)
							.where(
								and(
									eq(sharedCategoriesTable.owner, locals.user.id),
									eq(sharedCategoriesTable.categoryId, bookmark.category)
								)
							)
							.limit(1)
					: [];

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
	'update-category': validateForm(
		z.object({
			category: z.string(),
			bookmark: z.string()
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			const [bookmark] = await db
				.select()
				.from(bookmarksTable)
				.where(and(eq(bookmarksTable.userId, locals.user.id), eq(bookmarksTable.id, form.bookmark)))
				.limit(1);

			if (!bookmark) {
				error(404, { message: 'Bookmark not found' });
			}

			const { categoryId, fromShareId } = await resolveCategory(locals.user, form.category);

			await db
				.update(bookmarksTable)
				.set({
					category: categoryId,
					fromShareId,
					updatedAt: new Date()
				})
				.where(eq(bookmarksTable.id, form.bookmark));
		}
	),

	unlock: async (event) => {
		const locals = validateAuth(event);
		const formData = await event.request.formData();
		const pin = formData.get('pin')?.toString() ?? '';

		if (!/^\d{4,6}$/.test(pin)) {
			return fail(400, { error: 'PIN must be 4-6 digits' });
		}

		const [userRecord] = await db
			.select({ secretPinHash: usersTable.secretPinHash })
			.from(usersTable)
			.where(eq(usersTable.id, locals.user.id))
			.limit(1);

		if (!userRecord?.secretPinHash) {
			return fail(400, { error: 'No PIN has been set' });
		}

		const pinError = await auth.verifySecretPin(locals.user.id, userRecord.secretPinHash, pin);
		if (pinError) {
			return fail(401, { error: pinError });
		}

		const token = auth.createSecretSessionToken(locals.user.id, userRecord.secretPinHash);
		auth.setSecretSessionCookie(event, token);

		return { success: true };
	},

	lock: async (event) => {
		validateAuth(event);
		auth.deleteSecretSessionCookie(event);
		redirect(302, '/');
	},

	'set-pin': validateForm(
		z.object({
			pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
			currentPin: z.string().optional()
		}),
		async (event, form) => {
			const locals = validateAuth(event);

			const [userRecord] = await db
				.select({ secretPinHash: usersTable.secretPinHash })
				.from(usersTable)
				.where(eq(usersTable.id, locals.user.id))
				.limit(1);

			if (userRecord?.secretPinHash) {
				if (!form.currentPin) {
					error(400, 'Current PIN is required to change it');
				}
				const pinError = await auth.verifySecretPin(
					locals.user.id,
					userRecord.secretPinHash,
					form.currentPin
				);
				if (pinError) {
					error(401, pinError);
				}
			}

			const newPinHash = await hash(form.pin, auth.argon2Options);

			await db
				.update(usersTable)
				.set({ secretPinHash: newPinHash })
				.where(eq(usersTable.id, locals.user.id));

			auth.deleteSecretSessionCookie(event);

			redirect(302, '/');
		}
	)
};

/**
 * Get shared bookmarks for a specific category. This will be shown to the user the category is shared with as well as the owner of the category.
 */
async function getSharedBookmarks(
	categoryId: string,
	order: SQL<unknown>,
	viewerId: string,
	ownerId: string,
	secretUnlocked: boolean,
	showArchived?: boolean,
	tagId?: string
) {
	const sharedFilters = [
		eq(categoriesTable.id, categoryId),
		// secret bookmarks are only ever visible to their owner, and only while unlocked
		secretUnlocked
			? or(eq(bookmarksTable.isSecret, false), eq(bookmarksTable.userId, viewerId))
			: eq(bookmarksTable.isSecret, false),
		showArchived ? isNotNull(bookmarksTable.deletedAt) : isNull(bookmarksTable.deletedAt),
		...(tagId
			? [
					exists(
						db
							.select()
							.from(bookmarkTags)
							.where(
								and(eq(bookmarkTags.bookmarkId, bookmarksTable.id), eq(bookmarkTags.tagId, tagId))
							)
					)
				]
			: [])
	];

	return db
		.select({
			...getTableColumns(bookmarksTable),
			tags: sql<
				Tag[]
			>`coalesce(json_agg(json_build_object('name', ${tagsTable.name})) FILTER (WHERE ${tagsTable.id} IS NOT NULL), '[]')`.as(
				'tags'
			),
			category: sql<Category>`json_build_object('name', ${categoriesTable.name})`.as('category'),
			canEdit: sql<boolean>`${bookmarksTable.userId} = ${viewerId}`,
			canArchive: sql<boolean>`${bookmarksTable.userId} = ${viewerId} OR ${viewerId} = ${ownerId}`
		})
		.from(bookmarksTable)
		.leftJoin(bookmarkTags, eq(bookmarksTable.id, bookmarkTags.bookmarkId))
		.leftJoin(tagsTable, eq(bookmarkTags.tagId, tagsTable.id))
		.leftJoin(categoriesTable, eq(bookmarksTable.category, categoriesTable.id))
		.groupBy(bookmarksTable.id, categoriesTable.id)
		.orderBy(order)
		.where(and(...sharedFilters));
}

/**
 * Get all bookmarks for a user. Does not include shared category bookmarks.
 */
function getBookmarks(filters: SQL<unknown>[], order: SQL<unknown>, userId: string) {
	return db
		.select({
			...getTableColumns(bookmarksTable),
			tags: sql<
				Tag[]
			>`coalesce(json_agg(json_build_object('id', ${tagsTable.id},'name', ${tagsTable.name}, 'shared', ${tagsTable.userId} != ${userId})) FILTER (WHERE ${tagsTable.id} IS NOT NULL), '[]')`.as(
				'tags'
			),
			category:
				sql<Category>`json_build_object('id', ${categoriesTable.id}, 'name', ${categoriesTable.name})`.as(
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
