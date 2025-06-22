import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import { SQL } from 'bun';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { building } from '$app/environment';

if (!env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const client = new SQL(env.DATABASE_URL) as any;
client.options = {
	parsers: {},
	serializers: {}
};

export const db = drizzle({ client, logger: false });

let isMigrated = false;

if (!building && !isMigrated) {
	await migrate(db, { migrationsFolder: 'drizzle' });
	console.log('Database migrated');
	isMigrated = true;
}
