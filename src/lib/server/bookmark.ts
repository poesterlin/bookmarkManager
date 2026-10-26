import { error } from '@sveltejs/kit';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from './db';
import {
	type User,
	categoriesTable,
	bookmarksTable,
	tagsTable,
	bookmarkTags,
	sharedCategoriesTable
} from './db/schema';
import { generateId } from './util';

export interface BookmarksDTO {
	title: string;
	url: string;
	tags: string[];
	description?: string;
	favicon?: string;
	theme?: string;
	category?: string;
	newCategory?: string;
	parentCategoryId?: string;
	isSecret?: boolean;
}

export interface ResolvedCategory {
	categoryId: string;
	/** set when the category belongs to a collection shared with the user */
	fromShareId: string | null;
}

/**
 * Resolve a category id selected in the UI to a category the user may put bookmarks into.
 * Accepts the user's own categories, share ids of collections shared with write access, and
 * sub-categories of such collections.
 */
export async function resolveCategory(
	user: Pick<User, 'id'>,
	id: string
): Promise<ResolvedCategory> {
	const [own] = await db
		.select({ id: categoriesTable.id })
		.from(categoriesTable)
		.where(and(eq(categoriesTable.userId, user.id), eq(categoriesTable.id, id)))
		.limit(1);

	if (own) {
		return { categoryId: own.id, fromShareId: null };
	}

	const [shared] = await db
		.select({
			id: sharedCategoriesTable.id,
			categoryId: sharedCategoriesTable.categoryId,
			allowWriteAccess: sharedCategoriesTable.allowWriteAccess
		})
		.from(sharedCategoriesTable)
		.where(and(eq(sharedCategoriesTable.id, id), eq(sharedCategoriesTable.userId, user.id)))
		.limit(1);

	const [sharedChild] = shared
		? []
		: await db
				.select({
					id: sharedCategoriesTable.id,
					categoryId: categoriesTable.id,
					allowWriteAccess: sharedCategoriesTable.allowWriteAccess
				})
				.from(sharedCategoriesTable)
				.innerJoin(categoriesTable, eq(categoriesTable.parentId, sharedCategoriesTable.categoryId))
				.where(and(eq(categoriesTable.id, id), eq(sharedCategoriesTable.userId, user.id)))
				.limit(1);

	const share = shared ?? sharedChild;
	if (!share) {
		error(404, 'Category not found');
	}
	if (!share.allowWriteAccess) {
		error(403, 'You do not have write access to this collection');
	}

	return { categoryId: share.categoryId, fromShareId: share.id };
}

/**
 * Find or create a category of the user by name, optionally below a top level parent category.
 */
export async function findOrCreateCategory(
	user: Pick<User, 'id'>,
	name: string,
	parentCategoryId?: string
): Promise<string> {
	let parentId: string | null = null;

	if (parentCategoryId) {
		const [parent] = await db
			.select()
			.from(categoriesTable)
			.where(and(eq(categoriesTable.userId, user.id), eq(categoriesTable.id, parentCategoryId)))
			.limit(1);

		if (!parent) {
			error(404, 'Parent category not found');
		}
		if (parent.parentId) {
			error(400, 'Sub-categories cannot have children (max 1 level)');
		}
		parentId = parent.id;
	}

	const [existing] = await db
		.select({ id: categoriesTable.id })
		.from(categoriesTable)
		.where(
			and(
				eq(categoriesTable.userId, user.id),
				eq(categoriesTable.name, name),
				parentId ? eq(categoriesTable.parentId, parentId) : isNull(categoriesTable.parentId)
			)
		)
		.limit(1);

	if (existing) {
		return existing.id;
	}

	const id = generateId();
	await db.insert(categoriesTable).values({
		id,
		name,
		userId: user.id,
		parentId
	} satisfies typeof categoriesTable.$inferInsert);

	return id;
}

export async function createBookmark(user: Pick<User, 'id'>, form: BookmarksDTO) {
	let categoryId: string | undefined = undefined;
	let fromShareId: string | undefined = undefined;

	const newCategory = form.newCategory?.trim();
	if (newCategory) {
		categoryId = await findOrCreateCategory(user, newCategory, form.parentCategoryId);
	} else if (form.category) {
		const resolved = await resolveCategory(user, form.category);
		categoryId = resolved.categoryId;
		fromShareId = resolved.fromShareId ?? undefined;
	}

	const tags = [...new Set(form.tags.map((tag) => tag.trim()))].filter(Boolean);
	const id = generateId();

	await db.transaction(async (tx) => {
		await tx.insert(bookmarksTable).values({
			id,
			title: form.title,
			url: form.url,
			userId: user.id,
			createdAt: new Date(),
			updatedAt: new Date(),
			category: categoryId,
			description: form.description,
			isFavorite: false,
			theme: form.theme,
			favicon: form.favicon,
			fromShareId,
			isSecret: form.isSecret ?? false
		} satisfies typeof bookmarksTable.$inferInsert);

		if (tags.length) {
			const existing = await tx
				.select()
				.from(tagsTable)
				.where(and(eq(tagsTable.userId, user.id), inArray(tagsTable.name, tags)));

			if (existing.length) {
				await tx.insert(bookmarkTags).values(
					existing.map((tag) => ({
						tagId: tag.id,
						bookmarkId: id
					}))
				);
			}

			const names = new Set(existing.map((tag) => tag.name));
			const newTags = tags.filter((tag) => !names.has(tag));

			if (newTags.length === 0) {
				return;
			}

			const newTagsIds = newTags.map(() => generateId());

			await tx.insert(tagsTable).values(
				newTags.map(
					(tag, i) =>
						({
							id: newTagsIds[i],
							name: tag,
							userId: user.id,
							createdAt: new Date(),
							updatedAt: new Date()
						}) satisfies typeof tagsTable.$inferInsert
				)
			);

			await tx.insert(bookmarkTags).values(
				newTagsIds.map((tagId) => ({
					tagId,
					bookmarkId: id
				}))
			);
		}
	});

	return { id };
}
