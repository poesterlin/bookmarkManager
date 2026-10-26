/**
 * Clean up titles and descriptions of existing bookmarks with the same rules used when adding
 * new ones (site names, title/description repeating each other).
 *
 * Usage: bun cli/clean-metadata.ts [--apply] [--all]
 *   default   dry run, prints the changes
 *   --apply   write the changes
 *   --all     include bookmarks that were edited after creation (default: skip them, the user
 *             may have written the title/description by hand)
 */
import { SQL } from 'bun';
import { cleanMetadata } from '../src/lib/server/metadata';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const includeEdited = args.has('--all');

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const sql = new SQL(process.env.DATABASE_URL);

const rows: { id: string; url: string; title: string; description: string | null }[] =
	includeEdited
		? await sql`select id, url, title, description from bookmarks order by created_at`
		: // createdAt/updatedAt are set separately on insert and can differ by a few ms
			await sql`select id, url, title, description from bookmarks
				where abs(extract(epoch from updated_at - created_at)) < 1
				order by created_at`;

let changed = 0;
for (const row of rows) {
	const description = row.description?.trim() || null;
	const cleaned = cleanMetadata(row.url, { title: row.title, description });
	const title = cleaned.title ?? row.title;

	if (title === row.title && cleaned.description === description) continue;
	changed++;

	console.log(`${row.url}`);
	if (title !== row.title) console.log(`  title: ${row.title}\n      -> ${title}`);
	if (cleaned.description !== description) {
		console.log(`  description: ${description}\n            -> ${cleaned.description}`);
	}
	console.log();

	if (apply) {
		// updated_at stays untouched, this is not a user edit
		await sql`update bookmarks set title = ${title}, description = ${cleaned.description}
			where id = ${row.id}`;
	}
}

console.log(
	`${changed} of ${rows.length} bookmarks ${apply ? 'updated' : 'would change (dry run, use --apply to write)'}`
);
await sql.close();
