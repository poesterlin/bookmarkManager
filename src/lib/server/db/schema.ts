import { boolean, pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

const fullCascade = { onDelete: 'cascade', onUpdate: 'cascade' } as const;

export const usersTable = pgTable('user', {
	id: text('id').primaryKey(),
	email: text('email').unique('user_email_unique', { nulls: 'distinct' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
	lastLogin: timestamp('last_login', { withTimezone: true, mode: 'date' }),
	username: text('username').notNull().unique('user_username_unique'),
	passwordHash: text('password_hash').notNull()
});

export type User = typeof usersTable.$inferSelect;

export const sessionTable = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => usersTable.id, fullCascade),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export type Session = typeof sessionTable.$inferSelect;

export const bookmarksTable = pgTable('bookmarks', {
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
});

export type Bookmark = Omit<typeof bookmarksTable.$inferSelect, 'category'> & { tags: Tag[], category: Category };

export const tagsTable = pgTable('tags', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
	userId: text('user_id')
		.notNull()
		.references(() => usersTable.id, fullCascade)
});

export type Tag = typeof tagsTable.$inferSelect;

export const bookmarkTags = pgTable('bookmark_tags', {
	bookmarkId: text('bookmark_id')
		.notNull()
		.references(() => bookmarksTable.id, fullCascade),
	tagId: text('tag_id')
		.notNull()
		.references(() => tagsTable.id, fullCascade)
});

export const categoriesTable = pgTable('categories', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	userId: text('user_id')
		.notNull()
		.references(() => usersTable.id, fullCascade)
});

export type Category = typeof categoriesTable.$inferSelect;