import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bookmarksTable, categoriesTable } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';
import { validateAuth } from '$lib/server/util';

interface BookmarkExportOptions {
	folderName: string;
	userId: string;
	includeSecret: boolean;
	fetch: typeof fetch;
}

async function exportBookmarksToHTML(options: BookmarkExportOptions) {
	const { folderName, userId, includeSecret, fetch } = options;

	// Get current timestamp in seconds
	const currentTimestamp = Math.floor(Date.now() / 1000);

	// Fetch all bookmarks
	const bookmarksList = await db
		.select({
			id: bookmarksTable.id,
			title: bookmarksTable.title,
			url: bookmarksTable.url,
			favicon: bookmarksTable.favicon,
			createdAt: bookmarksTable.createdAt,
			category: categoriesTable.name
		})
		.from(bookmarksTable)
		.leftJoin(categoriesTable, eq(bookmarksTable.category, categoriesTable.id))
		.where(
			and(
				eq(bookmarksTable.userId, userId),
				isNull(bookmarksTable.deletedAt),
				includeSecret ? undefined : eq(bookmarksTable.isSecret, false)
			)
		);

	// fetch icons concurrently instead of one request per bookmark in sequence
	const icons = new Map<string, string>();
	const withIcon = bookmarksList.filter((bookmark) => bookmark.favicon);
	const concurrency = 8;
	for (let i = 0; i < withIcon.length; i += concurrency) {
		await Promise.all(
			withIcon.slice(i, i + concurrency).map(async (bookmark) => {
				try {
					const res = await fetch(`/icon/${bookmark.id}`);
					if (!res.ok) return;
					const type = res.headers.get('content-type') ?? 'image/png';
					const buffer = Buffer.from(await res.arrayBuffer());
					icons.set(bookmark.id, `data:${type};base64,${buffer.toString('base64')}`);
				} catch {
					// export without icon
				}
			})
		);
	}

	// Start building the HTML content
	const htmlParts = [
		'<!DOCTYPE NETSCAPE-Bookmark-file-1>',
		'<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
		`<TITLE>Bookmarks</TITLE>`,
		`<H1>Bookmarks</H1>`,
		'<DL><p>',
		`    <DT><H3 ADD_DATE="${currentTimestamp}" LAST_MODIFIED="${currentTimestamp}" PERSONAL_TOOLBAR_FOLDER="true">${escapeHTML(folderName)}</H3>`,
		'    <DL><p>'
	];

	// Group bookmarks by category
	const bookmarksByCategory = bookmarksList.reduce(
		(acc, bookmark) => {
			const category = bookmark.category || 'Uncategorized';
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push(bookmark);
			return acc;
		},
		{} as Record<string, typeof bookmarksList>
	);

	// Add bookmarks by category
	for (const [category, categoryBookmarks] of Object.entries(bookmarksByCategory)) {
		// Add category folder if it's not "Uncategorized"
		if (category) {
			htmlParts.push(
				`        <DT><H3 ADD_DATE="${currentTimestamp}">${escapeHTML(category)}</H3>`,
				'        <DL><p>'
			);
		}

		// Add bookmarks in this category
		for (const bookmark of categoryBookmarks) {
			const createdTimestamp = Math.floor(new Date(bookmark.createdAt).getTime() / 1000);

			const icon = icons.get(bookmark.id);
			const iconAttr = icon ? ` ICON="${icon}"` : '';

			htmlParts.push(
				`            <DT><A HREF="${escapeHTML(bookmark.url)}" ADD_DATE="${createdTimestamp}"${iconAttr}>${escapeHTML(
					bookmark.title
				)}</A>`
			);
		}

		// Close category folder if it's not "Uncategorized"
		if (category) {
			htmlParts.push('        </DL><p>');
		}
	}

	// Close the main structure
	htmlParts.push('    </DL><p>', '</DL><p>');

	// Join all parts with newlines
	return htmlParts.join('\n');
}

function escapeHTML(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export const GET: RequestHandler = async (event) => {
	const locals = validateAuth(event);
	const { fetch } = event;

	// Usage example:
	const result = await exportBookmarksToHTML({
		folderName: 'Bookmarks Toolbar',
		userId: locals.user.id,
		includeSecret: locals.secretUnlocked,
		fetch
	});

	return new Response(result, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Disposition': `attachment; filename=bookmarks.html`
		}
	});
};
