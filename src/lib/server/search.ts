const MAX_QUERY_LENGTH = 200;
const MAX_TERMS = 8;

/** Escape LIKE wildcards so a term is matched literally. */
export function escapeLike(term: string) {
	return term.replace(/[\\%_]/g, (c) => '\\' + c);
}

/** Letters and digits only, matches the `regexp_replace(..., '[^[:alnum:]]+', '')` in SQL. */
export function compact(term: string) {
	return term.replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * Split a search query into unique lowercase terms. Quoted phrases ("foo bar") stay together.
 */
export function parseQuery(query: string): string[] {
	const terms = [...query.slice(0, MAX_QUERY_LENGTH).matchAll(/"([^"]+)"|(\S+)/g)]
		.map((m) => (m[1] ?? m[2]).replace(/"/g, '').trim().toLowerCase())
		.filter((term) => term.length > 0);
	return [...new Set(terms)].slice(0, MAX_TERMS);
}
