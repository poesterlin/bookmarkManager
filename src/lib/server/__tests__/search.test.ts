import { describe, it, expect } from 'bun:test';
import { compact, escapeLike, parseQuery } from '../search';

describe('parseQuery()', () => {
	it('splits into unique lowercase terms', () => {
		expect(parseQuery('  Svelte  docs svelte ')).toEqual(['svelte', 'docs']);
	});

	it('keeps quoted phrases together', () => {
		expect(parseQuery('"hello world" rust')).toEqual(['hello world', 'rust']);
	});

	it('drops stray quotes and empty input', () => {
		expect(parseQuery('"')).toEqual([]);
		expect(parseQuery('')).toEqual([]);
		expect(parseQuery('say"hi')).toEqual(['sayhi']);
	});

	it('limits the number of terms', () => {
		expect(parseQuery('a b c d e f g h i j').length).toBe(8);
	});
});

describe('escapeLike()', () => {
	it('escapes LIKE wildcards', () => {
		expect(escapeLike('100%_off\\')).toBe('100\\%\\_off\\\\');
	});
});

describe('compact()', () => {
	it('keeps only letters and digits', () => {
		expect(compact('self-hosted')).toBe('selfhosted');
		expect(compact('Kündigung 2.0')).toBe('Kündigung20');
	});
});
