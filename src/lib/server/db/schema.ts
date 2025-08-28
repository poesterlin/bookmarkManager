import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from 'drizzle-orm/pg-core';

const fullCascade = { onDelete: 'cascade', onUpdate: 'cascade' } as const;

export const usersTable = pgTable(
	'user',
	{
		id: text('id').primaryKey(),
		email: text('email').unique('user_email_unique', { nulls: 'distinct' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
		lastLogin: timestamp('last_login', { withTimezone: true, mode: 'date' }),
		username: text('username').notNull().unique('user_username_unique'),
		passwordHash: text('password_hash').notNull()
	},
	(table) => [uniqueIndex('user_email_idx').on(table.email)]
);

export type User = typeof usersTable.$inferSelect;

export const sessionTable = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => usersTable.id, fullCascade),
		expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [index('session_user_id_idx').on(table.userId)]
);

export type Session = typeof sessionTable.$inferSelect;

export const challengeTokenTable = pgTable('challenge_token', {
	id: text('token').primaryKey(),
	userId: text('user_id').references(() => usersTable.id, fullCascade),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export type ChallengeToken = typeof challengeTokenTable.$inferSelect;

export const bookmarksTable = pgTable(
	'bookmarks',
	{
		id: text('id').primaryKey(),
		title: text('title').notNull(),
		url: text('url').notNull(),
		description: text('description'),
		favicon: text('favicon'),
		theme: text('theme'),
		category: text('category').references(() => categoriesTable.id, fullCascade),
		isFavorite: boolean('is_favorite').notNull().default(false),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		userId: text('user_id')
			.notNull()
			.references(() => usersTable.id, fullCascade),
		clicks: integer('clicks').notNull().default(0),
		lastClicked: timestamp('last_clicked', { withTimezone: true, mode: 'date' }),
		deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
		fromShareId: text('from_share_id').references(() => sharedCategoriesTable.id, { onDelete: 'set null', onUpdate: 'cascade' })
	},
	(table) => [
		index('bookmarks_composite').on(
			table.userId,
			table.deletedAt,
			table.category,
			table.isFavorite
		),
		index('bookmarks_user_id_idx').on(table.userId),
		index('bookmarks_category_idx').on(table.category),
		index('bookmarks_deleted_at_idx').on(table.deletedAt),
		index('bookmarks_is_favorite_idx').on(table.isFavorite)
	]
);

export type Bookmark = Omit<typeof bookmarksTable.$inferSelect, 'category'> & {
	tags: Tag[];
	category: Category;
};

export const tagsTable = pgTable(
	'tags',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		userId: text('user_id')
			.notNull()
			.references(() => usersTable.id, fullCascade)
	},
	(table) => [
		index('tags_user_id_idx').on(table.userId),
		index('tags_name_idx').on(table.name),
		uniqueIndex('tags_user_id_name_unique_idx').on(table.userId, table.name)
	]
);

export type Tag = typeof tagsTable.$inferSelect & {
	shared?: true
};

export const bookmarkTags = pgTable(
	'bookmark_tags',
	{
		bookmarkId: text('bookmark_id')
			.notNull()
			.references(() => bookmarksTable.id, fullCascade),
		tagId: text('tag_id')
			.notNull()
			.references(() => tagsTable.id, fullCascade)
	},
	(table) => [
		uniqueIndex('bookmark_tags_unique_idx').on(table.bookmarkId, table.tagId),
		index('bookmark_tags_bookmark_id_idx').on(table.bookmarkId),
		index('bookmark_tags_tag_id_idx').on(table.tagId)
	]
);

export const categoriesTable = pgTable(
	'categories',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => usersTable.id, fullCascade)
	},
	(table) => [
		index('categories_user_id_idx').on(table.userId),
		index('categories_name_idx').on(table.name),
		uniqueIndex('categories_user_id_name_unique_idx').on(table.userId, table.name)
	]
);

export type Category = typeof categoriesTable.$inferSelect & {
	isShared?: boolean | null;
};

export const sharedCategoriesTable = pgTable(
	"shared_categories",
	{
		id: text("id").primaryKey(),
		categoryId: text("category_id").notNull().references(() => categoriesTable.id, fullCascade),
		owner: text('owner_id')
			.notNull()
			.references(() => usersTable.id, fullCascade),
		userId: text('user_id')
			.references(() => usersTable.id, fullCascade),
		token: text("token"),
		allowWriteAccess: boolean("allow_writes").notNull().default(false),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("no_douple_categories").on(table.categoryId, table.userId)
	]
);

export type SharedCategory = {
	id: string;
	name: string;
	allowWriteAccess: boolean;
}