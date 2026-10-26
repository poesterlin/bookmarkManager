import { lookup } from 'dns/promises';
import ipaddr from 'ipaddr.js';

export class UnsafeUrlError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UnsafeUrlError';
	}
}

const MAX_REDIRECTS = 5;

/**
 * Throws if the URL is not https on the default port, or if its host resolves to any
 * non-public address (private, loopback, link-local, CGNAT/Tailscale, ULA, ...).
 * Every resolved address is checked, IPv4 and IPv6.
 */
export async function assertPublicUrl(url: URL) {
	if (url.protocol !== 'https:') {
		throw new UnsafeUrlError('Only https URLs are allowed');
	}
	if (url.port && url.port !== '443') {
		throw new UnsafeUrlError('Only the default https port is allowed');
	}
	if (url.username || url.password) {
		throw new UnsafeUrlError('Credentials in URLs are not allowed');
	}

	// URL.hostname keeps the brackets of IPv6 literals
	const hostname = url.hostname.replace(/^\[|\]$/g, '');

	let addresses: string[];
	if (ipaddr.isValid(hostname)) {
		addresses = [hostname];
	} else {
		try {
			const results = await lookup(hostname, { all: true, verbatim: true });
			addresses = results.map((r) => r.address);
		} catch {
			throw new UnsafeUrlError('Failed to resolve URL host');
		}
	}

	if (addresses.length === 0) {
		throw new UnsafeUrlError('Failed to resolve URL host');
	}

	for (const address of addresses) {
		let addr = ipaddr.parse(address);
		if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
			addr = (addr as ipaddr.IPv6).toIPv4Address();
		}
		if (addr.range() !== 'unicast') {
			console.error('Blocked request to non-public address:', url.hostname, address);
			throw new UnsafeUrlError('URL points to an internal resource');
		}
	}
}

/**
 * fetch() that only talks to public https hosts. Redirects are followed manually so that
 * every hop is validated, a redirect to an internal address is rejected.
 *
 * Note: the host is resolved again by fetch() itself, so a DNS rebinding attack with a
 * very short TTL is not fully prevented.
 */
export async function safeFetch(input: string | URL, init: RequestInit = {}) {
	let url = new URL(input);

	for (let i = 0; i <= MAX_REDIRECTS; i++) {
		await assertPublicUrl(url);

		const response = await fetch(url, { ...init, redirect: 'manual' });

		const location = response.headers.get('location');
		if (response.status >= 300 && response.status < 400 && location) {
			await response.body?.cancel();
			url = new URL(location, url);
			continue;
		}

		return response;
	}

	throw new UnsafeUrlError('Too many redirects');
}
