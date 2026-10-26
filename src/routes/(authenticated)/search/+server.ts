import { db } from '$lib/server/db';
import {
	bookmarksTable,
	bookmarkTags,
	categoriesTable,
	sharedCategoriesTable,
	tagsTable,
	type Category,
	type Tag
} from '$lib/server/db/schema';
import { compact, escapeLike, parseQuery } from '$lib/server/search';
import { validateAuth } from '$lib/server/util';
import { json } from '@sveltejs/kit';
import { and, eq, getTableColumns, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { RequestHandler } from './$types';

const RESULT_LIMIT = 50;
/** minimum pg_trgm word similarity for a term to count as a fuzzy (typo tolerant) match */
const FUZZY_THRESHOLD = 0.5;

/**
 * Typos that trigrams miss, like swapped letters ("ardiuno", "pyhton"): true when a word of
 * `text` is within 1 (4-5 letter terms) or 2 (longer terms) edits of the term.
 */
function typoMatches(term: string, text: SQL): SQL {
	if (term.length < 4 || !/^[\p{L}\p{N}]+$/u.test(term)) return sql`false`;
	const maxEdits = term.length <= 5 ? 1 : 2;
	return sql`exists (
		select 1 from regexp_split_to_table(lower(${text}), '[^[:alnum:]]+') as word
		where length(word) between ${term.length - maxEdits}::int and ${term.length + maxEdits}::int
			and levenshtein_less_equal(word, ${term}, ${maxEdits}::int) <= ${maxEdits}::int
	)`;
}

export const GET: RequestHandler = async (event) => {
	const locals = validateAuth(event);
	const userId = locals.user.id;
	const query = event.url.searchParams.get('query')?.trim() ?? '';
	const terms = parseQuery(query);

	if (terms.length === 0 || query.length < 2) {
		return json([]);
	}

	// The query is grouped per bookmark, tags are aggregated once and the term filters run in
	// HAVING, so nothing is evaluated per tag row or in correlated subqueries.
	const parentCategory = alias(categoriesTable, 'parent_category');
	const tagNames = sql`coalesce(string_agg(${tagsTable.name}, ' '), '')`;

	const title = sql`${bookmarksTable.title}`;
	const description = sql`coalesce(${bookmarksTable.description}, '')`;
	const url = sql`${bookmarksTable.url}`;
	// a sub-category is also found by its parent's name
	const categoryName = sql`concat_ws(' ', ${categoriesTable.name}, ${parentCategory.name})`;
	// title and tags without punctuation/whitespace, so "selfhosted" finds "Self-hosted"
	const compactText = sql`regexp_replace(${title} || ' ' || ${tagNames}, '[^[:alnum:]]+', '', 'g')`;

	// Every term has to match somewhere (substring or fuzzy), the score ranks the matches.
	const termFilters: SQL[] = [];
	const termScores: SQL[] = [];
	for (const term of terms) {
		const pattern = `%${escapeLike(term)}%`;
		const prefixPattern = `${escapeLike(term)}%`;
		const titleMatch = sql`${title} ilike ${pattern}`;
		const descriptionMatch = sql`${description} ilike ${pattern}`;
		const urlMatch = sql`${url} ilike ${pattern}`;
		const tagMatch = sql`${tagNames} ilike ${pattern}`;
		const categoryMatch = sql`${categoryName} ilike ${pattern}`;
		const compactTerm = compact(term);
		const compactMatch =
			compactTerm.length >= 3 ? sql`${compactText} ilike ${`%${compactTerm}%`}` : sql`false`;
		const fuzzyTitle = sql`word_similarity(${term}, ${title})`;
		const fuzzyDescription = sql`word_similarity(${term}, ${description})`;
		const fuzzyTags = sql`word_similarity(${term}, ${tagNames})`;
		const fuzzyCategory = sql`word_similarity(${term}, ${categoryName})`;
		const typoMatch = typoMatches(
			term,
			sql`${title} || ' ' || ${tagNames} || ' ' || ${categoryName}`
		);

		termFilters.push(
			sql`(${titleMatch} or ${descriptionMatch} or ${urlMatch} or ${tagMatch} or ${categoryMatch}
				or ${compactMatch} or ${fuzzyTitle} >= ${FUZZY_THRESHOLD} or ${fuzzyDescription} >= ${FUZZY_THRESHOLD}
				or ${fuzzyTags} >= ${FUZZY_THRESHOLD} or ${fuzzyCategory} >= ${FUZZY_THRESHOLD}
				or ${typoMatch})`
		);
		// exact matches score full points, typo matches score their similarity
		termScores.push(
			sql`(
				3 * ${fuzzyTitle}
				+ case when ${title} ilike ${prefixPattern} then 2 when ${titleMatch} then 1.5 when ${compactMatch} then 1 else 0 end
				+ case when ${tagMatch} then 2 else 2 * ${fuzzyTags} end
				+ case when ${categoryMatch} then 1 else ${fuzzyCategory} end
				+ case when ${urlMatch} then 1 else 0 end
				+ ${fuzzyDescription}
				+ case when ${typoMatch} then 1 else 0 end
			)`
		);
	}

	// small boost for bookmarks that are actually used
	const score = sql<number>`(${sql.join(termScores, sql` + `)})
		+ ln(1 + ${bookmarksTable.clicks}) * 0.1
		+ case when ${bookmarksTable.isFavorite} then 0.3 else 0 end`;

	// Own bookmarks, plus bookmarks in collections shared with the user (and their
	// sub-categories), plus bookmarks others added to the user's own collections.
	const sharedParent = alias(categoriesTable, 'shared_parent');
	const visibleCategories = db
		.select({ id: categoriesTable.id })
		.from(categoriesTable)
		.leftJoin(sharedParent, eq(sharedParent.id, categoriesTable.parentId))
		.where(
			or(
				eq(categoriesTable.userId, userId),
				inArray(
					categoriesTable.id,
					db
						.select({ id: sharedCategoriesTable.categoryId })
						.from(sharedCategoriesTable)
						.where(eq(sharedCategoriesTable.userId, userId))
				),
				inArray(
					sharedParent.id,
					db
						.select({ id: sharedCategoriesTable.categoryId })
						.from(sharedCategoriesTable)
						.where(eq(sharedCategoriesTable.userId, userId))
				)
			)
		);

	const filters = [
		or(eq(bookmarksTable.userId, userId), inArray(bookmarksTable.category, visibleCategories)),
		isNull(bookmarksTable.deletedAt),
		// secret bookmarks are only visible to their owner, and only while unlocked
		locals.secretUnlocked
			? or(eq(bookmarksTable.isSecret, false), eq(bookmarksTable.userId, userId))
			: eq(bookmarksTable.isSecret, false)
	];

	const results = await db
		.select({
			...getTableColumns(bookmarksTable),
			tags: sql<Tag[]>`coalesce(
				json_agg(json_build_object(
					'id', case when ${tagsTable.userId} = ${userId} then ${tagsTable.id} end,
					'name', ${tagsTable.name},
					'shared', ${tagsTable.userId} != ${userId}
				)) FILTER (WHERE ${tagsTable.id} IS NOT NULL),
				'[]'
			)`.as('tags'),
			// only link categories the user owns, shared ones are addressed by their share id
			category: sql<Category>`json_build_object(
				'id', case when ${categoriesTable.userId} = ${userId} then ${categoriesTable.id} end,
				'name', ${categoriesTable.name}
			)`.as('category'),
			canEdit: sql<boolean>`${bookmarksTable.userId} = ${userId}`,
			canArchive: sql<boolean>`${bookmarksTable.userId} = ${userId} or coalesce(${categoriesTable.userId} = ${userId}, false)`,
			score: score.as('score')
		})
		.from(bookmarksTable)
		.leftJoin(bookmarkTags, eq(bookmarksTable.id, bookmarkTags.bookmarkId))
		.leftJoin(tagsTable, eq(bookmarkTags.tagId, tagsTable.id))
		.leftJoin(categoriesTable, eq(bookmarksTable.category, categoriesTable.id))
		.leftJoin(parentCategory, eq(categoriesTable.parentId, parentCategory.id))
		.where(and(...filters))
		.groupBy(bookmarksTable.id, categoriesTable.id, parentCategory.id)
		.having(and(...termFilters))
		.orderBy(sql`score desc`, sql`${bookmarksTable.createdAt} desc`)
		.limit(RESULT_LIMIT);

	return json(results);
};
