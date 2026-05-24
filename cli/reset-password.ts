import { drizzle } from 'drizzle-orm/postgres-js';
import { SQL } from 'bun';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import * as readline from 'readline';

function promptHidden(prompt: string): Promise<string> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		(rl as any)._writeToOutput = (s: string) => {
			if (s === prompt) process.stdout.write(s);
		};
		rl.question(prompt, (answer) => {
			process.stdout.write('\n');
			rl.close();
			resolve(answer);
		});
	});
}

const usersTable = pgTable('user', {
	id: text('id').primaryKey(),
	username: text('username').notNull(),
	passwordHash: text('password_hash').notNull(),
	email: text('email'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
	lastLogin: timestamp('last_login', { withTimezone: true, mode: 'date' })
});

async function main() {
	const args = process.argv.slice(2);

	const isListCmd = args[0] === '--list';
	if (args.length < 1) {
		console.error('Usage: bun reset-password.ts <user-id>');
		console.error('       bun reset-password.ts --list');
		process.exit(1);
	}

	const DATABASE_URL = process.env.DATABASE_URL;
	if (!DATABASE_URL) {
		console.error('Error: DATABASE_URL environment variable is not set');
		process.exit(1);
	}

	const client = new SQL(DATABASE_URL) as any;
	client.options = { parsers: {}, serializers: {} };
	const db = drizzle({ client });

	if (isListCmd) {
		const users = await db
			.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email })
			.from(usersTable);

		if (users.length === 0) {
			console.log('No users found.');
		} else {
			console.log('Users:');
			for (const user of users) {
				console.log(`  id=${user.id}  username=${user.username}  email=${user.email ?? '(none)'}`);
			}
		}

		return;
	}

	const [userId] = args;

	const [existingUser] = await db
		.select({ id: usersTable.id, username: usersTable.username })
		.from(usersTable)
		.where(eq(usersTable.id, userId));

	if (!existingUser) {
		console.error(`Error: No user found with id "${userId}"`);
		process.exit(1);
	}

	const newPassword = await promptHidden(`New password for "${existingUser.username}": `);

	if (newPassword.length < 6 || newPassword.length > 255) {
		console.error('Error: Password must be between 6 and 255 characters');
		process.exit(1);
	}

	const passwordHash = await hash(newPassword, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});

	await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId));

	console.log(
		`Password reset successfully for user "${existingUser.username}" (${existingUser.id})`
	);
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
