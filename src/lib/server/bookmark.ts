import { and, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { type User, categoriesTable, bookmarksTable, tagsTable, bookmarkTags } from './db/schema';
import { generateId } from './util';

export interface BoomarksDTO {
	title: string;
	url: string;
	tags: string[];
	description?: string;
	favicon?: string;
	theme?: string;
	category?: string;
	newCategory?: string;
}

export async function createBookmark(user: Pick<User, 'id'>, form: BoomarksDTO) {
	let categoryId: string | undefined = undefined;

	if (form.category) {
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

	await db.transaction(async (tx) => {
		if (form.newCategory) {
			const [category] = await db
				.select()
				.from(categoriesTable)
				.where(and(eq(categoriesTable.userId, user.id), eq(categoriesTable.name, form.newCategory)))
				.limit(1);

			if (category) {
				categoryId = category.id;
			} else {
				categoryId = generateId();

				await tx.insert(categoriesTable).values({
					id: categoryId,
					name: form.newCategory,
					userId: user.id
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
			favicon: form.favicon
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
