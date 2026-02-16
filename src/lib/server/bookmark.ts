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
}

export async function createBookmark(user: Pick<User, 'id'>, form: BookmarksDTO) {
	let categoryId: string | undefined = undefined;
	let fromShareId: string | undefined = undefined;

	if (form.category) {
		const [sharedCategory] = await db
			.select()
			.from(sharedCategoriesTable)
			.where(
				and(
					eq(sharedCategoriesTable.id, form.category),
					eq(sharedCategoriesTable.userId, user.id)
				)
			)
			.limit(1);

		if (sharedCategory?.allowWriteAccess) {
			categoryId = sharedCategory.categoryId;
			fromShareId = sharedCategory.id;
		} else {
			const [category] = await db
				.select()
				.from(categoriesTable)
				.where(and(eq(categoriesTable.userId, user.id), eq(categoriesTable.id, form.category)))
				.limit(1);

			if (!category) {
				throw new Error('Category not found');
			}

			categoryId = category.id;
		}
	}

	await db.transaction(async (tx) => {
		if (form.newCategory) {
			let parentId: string | null = null;

			if (form.parentCategoryId) {
				const [parent] = await db
					.select()
					.from(categoriesTable)
					.where(and(eq(categoriesTable.userId, user.id), eq(categoriesTable.id, form.parentCategoryId)))
					.limit(1);

				if (!parent) {
					throw new Error('Parent category not found');
				}
				if (parent.parentId) {
					throw new Error('Sub-categories cannot have children (max 1 level)');
				}
				parentId = parent.id;
			}

			const filterConditions = [
				eq(categoriesTable.userId, user.id),
				eq(categoriesTable.name, form.newCategory)
			];
			if (parentId) {
				filterConditions.push(eq(categoriesTable.parentId, parentId));
			} else {
				filterConditions.push(isNull(categoriesTable.parentId));
			}

			const [category] = await db
				.select()
				.from(categoriesTable)
				.where(and(...filterConditions))
				.limit(1);

			if (category) {
				categoryId = category.id;
			} else {
				categoryId = generateId();

				await tx.insert(categoriesTable).values({
					id: categoryId,
					name: form.newCategory,
					userId: user.id,
					parentId
				} satisfies typeof categoriesTable.$inferInsert);
			}
		}

		const id = generateId();
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
			fromShareId
		} satisfies typeof bookmarksTable.$inferInsert);

		if (form.tags) {
			const existing = await db
				.select()
				.from(tagsTable)
				.where(and(eq(tagsTable.userId, user.id), inArray(tagsTable.name, form.tags)));

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
}
