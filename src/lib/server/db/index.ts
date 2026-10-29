import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import { SQL } from 'bun';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { building } from '$app/environment';

if (!env.DATABASE_URL && !building) {
	throw new Error('DATABASE_URL is not set');
}

/**
 * Wait for the database to accept connections before creating the shared client.
 *
 * Bun's SQL pool does not recover from a refused connection: if the first
 * attempt happens while Postgres is still starting (common at boot, where the
 * app can start before the database container), every later query reuses the
 * failed state and the app stays broken until it is restarted. Probing with a
 * throwaway client keeps the shared pool untouched.
 */
async function waitForDatabase(url: string, attempts = 60): Promise<void> {
	for (let attempt = 1; ; attempt++) {
		const probe = new SQL(url);
		try {
			await probe`select 1`;
			return;
		} catch (error) {
			if (attempt >= attempts) throw error;
			console.warn(`Database not ready (attempt ${attempt}/${attempts}), retrying in 1s`);
			await Bun.sleep(1000);
		} finally {
			await probe.close();
		}
	}
}

if (!building) {
	await waitForDatabase(env.DATABASE_URL!);
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
