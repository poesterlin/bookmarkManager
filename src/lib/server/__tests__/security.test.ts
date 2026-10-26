import { describe, it, expect, afterEach } from 'bun:test';
import { parseTags, safeRedirectPath } from '../util';
import { FailureLimiter } from '../rate-limit';
import { assertPublicUrl, safeFetch, UnsafeUrlError } from '../safe-fetch';

describe('safeRedirectPath()', () => {
	it('keeps same-origin paths', () => {
		expect(safeRedirectPath('?redirect=%2Fshare%3Ftoken%3Dabc')).toBe('/share?token=abc');
		expect(safeRedirectPath('?redirect=/')).toBe('/');
	});

	it('rejects external and protocol-relative targets', () => {
		expect(safeRedirectPath('?redirect=https://evil.example')).toBe('/');
		expect(safeRedirectPath('?redirect=//evil.example')).toBe('/');
		expect(safeRedirectPath('?redirect=/%5Cevil.example')).toBe('/');
		expect(safeRedirectPath('?redirect=javascript:alert(1)')).toBe('/');
	});

	it('falls back to / without a redirect', () => {
		expect(safeRedirectPath(undefined)).toBe('/');
		expect(safeRedirectPath('')).toBe('/');
		expect(safeRedirectPath('?foo=bar')).toBe('/');
	});
});

describe('parseTags()', () => {
	it('trims, dedupes and drops empty tags', () => {
		expect(parseTags('a, b,a,, c ,b')).toEqual(['a', 'b', 'c']);
		expect(parseTags('')).toEqual([]);
		expect(parseTags(undefined)).toEqual([]);
	});
});

describe('FailureLimiter', () => {
	it('blocks after the maximum number of failures and resets on success', () => {
		const limiter = new FailureLimiter(3, 60_000);
		expect(limiter.retryAfter('u')).toBe(0);
		limiter.fail('u');
		limiter.fail('u');
		expect(limiter.retryAfter('u')).toBe(0);
		limiter.fail('u');
		expect(limiter.retryAfter('u')).toBeGreaterThan(0);
		expect(limiter.retryAfter('other')).toBe(0);
		limiter.reset('u');
		expect(limiter.retryAfter('u')).toBe(0);
	});
});

describe('assertPublicUrl()', () => {
	const blocked = [
		'http://example.com/',
		'https://example.com:8443/',
		'https://user:pass@example.com/',
		'https://127.0.0.1/',
		'https://10.0.0.4/',
		'https://192.168.1.1/',
		'https://169.254.169.254/',
		'https://100.82.130.136/', // CGNAT / Tailscale
		'https://[::1]/',
		'https://[fd55:b43b:2321:1::4]/',
		'https://[::ffff:10.0.0.4]/',
		'https://0.0.0.0/',
		'https://localhost/'
	];

	for (const url of blocked) {
		it(`blocks ${url}`, async () => {
			await expect(assertPublicUrl(new URL(url))).rejects.toBeInstanceOf(UnsafeUrlError);
		});
	}

	it('allows public addresses', async () => {
		await expect(assertPublicUrl(new URL('https://1.1.1.1/'))).resolves.toBeUndefined();
		await expect(
			assertPublicUrl(new URL('https://[2606:4700:4700::1111]/'))
		).resolves.toBeUndefined();
	});
});

describe('safeFetch()', () => {
	const realFetch = globalThis.fetch;
	afterEach(() => {
		globalThis.fetch = realFetch;
	});

	function mockFetch(responses: Record<string, Response>) {
		const calls: string[] = [];
		globalThis.fetch = (async (input: string | URL | Request) => {
			const url = input.toString();
			calls.push(url);
			return responses[url] ?? new Response('not found', { status: 404 });
		}) as typeof fetch;
		return calls;
	}

	it('rejects a redirect to an internal address without requesting it', async () => {
		const calls = mockFetch({
			'https://1.1.1.1/': new Response(null, {
				status: 302,
				headers: { location: 'https://10.0.0.4:443/api' }
			})
		});

		await expect(safeFetch('https://1.1.1.1/')).rejects.toBeInstanceOf(UnsafeUrlError);
		expect(calls).toEqual(['https://1.1.1.1/']);
	});

	it('follows redirects between public hosts', async () => {
		mockFetch({
			'https://1.1.1.1/': new Response(null, { status: 301, headers: { location: '/next' } }),
			'https://1.1.1.1/next': new Response('ok')
		});

		const response = await safeFetch('https://1.1.1.1/');
		expect(await response.text()).toBe('ok');
	});
});
