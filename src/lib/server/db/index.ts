import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import { SQL } from 'bun';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { building } from '$app/environment';
import { sql } from 'drizzle-orm';

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
	try {
		const [version] = await db.select({
			version: sql`version()`
		}).from(sql`pg_catalog.pg_settings`);

		console.log('Postgres version:', version);

		await migrate(db, { migrationsFolder: 'drizzle' });
		console.log('Database migrated');
	} catch (error) {
		console.error('Error migrating database:', error);
		throw new Error('Error migrating database');
	} finally {
		isMigrated = true;
	}
}
