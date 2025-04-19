import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

const fullCascade = { onDelete: 'cascade', onUpdate: 'cascade' } as const;

export const usersTable = pgTable('user', {
	id: text('id').primaryKey(),
	email: text('email').unique('user_email_unique', { nulls: 'distinct' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
	lastLogin: timestamp('last_login', { withTimezone: true, mode: 'date' }),
	username: text('username').notNull().unique(),
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
