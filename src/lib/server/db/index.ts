import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import { SQL } from 'bun';

if (!env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const client = new SQL(env.DATABASE_URL) as any;
client.options = {
	parsers: {},
	serializers: {},
};

export const db = drizzle({ client, logger: false });
