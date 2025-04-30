import { assert, validateAuth } from '$lib/server/util';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { JSDOM } from 'jsdom';
import { error, json } from '@sveltejs/kit';
import { lookup } from 'dns/promises';
import ipaddr from 'ipaddr.js';
import { assertInstanceOf } from '$lib/client/util';

const schema = z.object({
	url: z.string().url().trim()
});

export const POST: RequestHandler = async (event) => {
	validateAuth(event);

	const form = await event.request.json();
	const { url } = schema.parse(form);
	const sanitizedUrl = sanitizeUrl(url);

	const error = await checkDNS(sanitizedUrl);
	if (error) {
		return error;
	}

	const text = await fetchWithSizeLimit(sanitizedUrl.toString());
	const data = await parseHTML(text);

	if (data.favicon) {
		const fullFaviconUrl = new URL(data.favicon, url);
		data.faviconData = await fetchFaviconBase64(fullFaviconUrl);
	}

	return json(data);
};

/**
 * Sanitize the URL to ensure it is a valid HTTPS URL and strip query strings and fragments.
 * @param url
 * @returns sanitized URL
 */
function sanitizeUrl(url: string) {
	// Check if the URL is valid
	if (!URL.canParse(url)) {

		// Check if adding 'https://' makes it valid
		const withProtocol = 'https://' + url;
		if (URL.canParse(withProtocol)) {
			url = withProtocol;
		} else {
			error(400, 'Invalid URL');
		}
	}

	const parsedUrl = URL.parse(url);
	assert(parsedUrl, 'URL parsing failed');

	const { protocol, port } = parsedUrl;

	// Only allow HTTPS protocol
	if (protocol !== 'https:') {
		error(400, 'Invalid URL');
	}

	// Check if the port is valid
	if (port && port !== '443') {
		error(400, 'Invalid URL');
	}

	// strip the query string and fragment from the URL
	return new URL(`${protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`);
}

/**
 * Fetch the favicon from the given URL and convert it to a base64 string.
 * @param fullFaviconUrl - The full URL of the favicon.
 * @returns Base64 encoded string of the favicon image.
 */
/**
 * Fetch the favicon from the given URL with size limit and timeout, convert to base64 data URI.
 * Returns undefined if fetch fails, size limit exceeded, or processing error occurs.
 * Throws SvelteKit error only for critical fetch setup issues (like AbortSignal).
 * @param fullFaviconUrl - The full, resolved URL of the favicon.
 * @param maxSizeBytes - Maximum allowed size in bytes for the favicon.
 * @returns Base64 encoded data URI string or undefined.
 */
async function fetchFaviconBase64(
	fullFaviconUrl: URL,
	maxSizeBytes = 512 * 1024 // 512 KB limit for favicon
): Promise<string | undefined> {
	let response: Response;
	let responseBodyStream: ReadableStream<Uint8Array> | null = null;
	const urlString = fullFaviconUrl.toString();

	try {
		response = await fetch(urlString, {
			signal: AbortSignal.timeout(1000), // Use the same timeout
			headers: {
				Accept: 'image/*', // Accept various image types
				// Add User-Agent here too
				'User-Agent': 'MyBookmarkFetcher/1.0 (+http://your-website.com/about)'
			},
			redirect: 'follow'
		});

		if (!response.ok) {
			console.warn(`Favicon fetch failed for ${urlString}: ${response.status}`);
			return undefined; // Don't treat as fatal error for the whole request
		}

		const contentType = response.headers.get('content-type');
		if (!contentType || !contentType.toLowerCase().startsWith('image/')) {
			console.warn(`Unexpected Content-Type for favicon ${urlString}: ${contentType}`);
			return undefined; // Not an image
		}

		responseBodyStream = response.body;
		if (!responseBodyStream) {
			throw new Error('Response body stream is null'); // Treat this as unexpected
		}
	} catch (e: unknown) {
		assertInstanceOf(e, Error);
		if (e.name === 'TimeoutError' || e.name === 'AbortError') {
			console.warn(`Favicon fetch timed out for ${urlString}`);
		} else {
			// Log other fetch errors but don't kill the main request
			console.error(`Favicon fetch error for ${urlString}:`, e);
		}
		return undefined; // Return undefined on fetch errors/timeout
	}

	// Read Response with Size Limit (for binary data)
	const reader = responseBodyStream.getReader();
	const chunks: Uint8Array[] = [];
	let bytesRead = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			bytesRead += value.byteLength;
			if (bytesRead > maxSizeBytes) {
				await reader.cancel(); // Stop reading
				console.warn(`Favicon size limit (${maxSizeBytes} bytes) exceeded for ${urlString}`);
				return undefined; // Exceeded limit, return undefined
			}
			chunks.push(value);
		}
	} catch (e) {
		console.error(`Error reading favicon response stream for ${urlString}:`, e);
		return undefined; // Error during read, return undefined
	} finally {
		reader.releaseLock();
	}

	// Combine chunks if successful and within limit
	if (chunks.length === 0) {
		console.warn(`Favicon fetch resulted in empty body for ${urlString}`);
		return undefined;
	}

	try {
		// Combine chunks into a single Buffer
		const imageBuffer = Buffer.concat(chunks);
		const base64 = imageBuffer.toString('base64');
		const fileType = response.headers.get('Content-Type') ?? 'image/png'; // Default if header missing
		return `data:${fileType};base64,${base64}`;
	} catch (e) {
		console.error(`Error processing favicon data for ${urlString}:`, e);
		return undefined; // Error during base64 conversion etc.
	}
}

/**
 * Parse the HTML string to extract title, description, favicon, and theme color.
 * @param html - The HTML string to parse.
 * @returns An object containing the extracted data.
 */
async function parseHTML(html: string) {
	// Create a JSDOM instance
	const dom = new JSDOM(html);
	dom.window.eval = () => {
		throw new Error('Script execution disabled.');
	};
	const doc = dom.window.document; // Access the document object

	// Query the elements - almost identical to your original code
	const title = doc.querySelector('title')?.textContent ?? null;
	const description =
		doc.querySelector("meta[name='description']")?.getAttribute('content') ?? null;
	const favicon = doc.querySelector("link[rel='icon']")?.getAttribute('href') ?? null;
	const theme = doc.querySelector("meta[name='theme-color']")?.getAttribute('content') ?? null;

	return { title, description, favicon, theme, faviconData: undefined as undefined | string };
}

/**
 * Check if the DNS resolves to a valid external IP address.
 * @param url - The URL object to check.
 * @returns A response indicating whether the DNS check passed or failed.
 */
async function checkDNS(url: URL) {
	let ip;
	try {
		const lookupResult = await lookup(url.hostname, { family: 4 });
		ip = lookupResult.address;

		if (!ip) {
			throw new Error('DNS lookup failed to return an address');
		}

		const addr = ipaddr.parse(ip);

		// Check if IP is allowed
		const forbiddenRanges = [
			'unspecified',
			'broadcast',
			'multicast',
			'linkLocal',
			'loopback',
			'private',
			'reserved'
		];

		if (forbiddenRanges.includes(addr.range())) {
			console.error('Blocked SSRF attempt to internal IP:', ip);
			return new Response('Invalid URL (points to internal resource)', {
				status: 400
			});
		}
	} catch (e) {
		console.error('DNS lookup or IP check failed:', e);
		return new Response('Failed to resolve URL host', { status: 400 });
	}
}

/**
 * Fetch the HTML content from the given URL with a size limit.
 * @param url
 * @param maxSizeBytes
 * @returns
 */
async function fetchWithSizeLimit(url: string, maxSizeBytes = 1 * 1024 * 1024) {
	let response;
	let responseBodyStream;
	try {
		response = await fetch(url, {
			signal: AbortSignal.timeout(5000),
			headers: {
				Accept: 'text/html'
			},
			redirect: 'follow'
		});

		if (!response.ok) {
			console.error(`Fetch failed for ${url}: ${response.status}`);
			error(400, 'Invalid URL');
		}

		const contentType = response.headers.get('content-type');
		if (!contentType || !contentType.includes('text/html')) {
			console.warn(`Unexpected Content-Type for ${url}: ${contentType}`);
			error(400, 'Invalid Content-Type');
		}

		responseBodyStream = response.body;
	} catch (e: unknown) {
		assertInstanceOf(e, Error);
		if (e.name === 'AbortError') {
			console.error(`Fetch timed out for ${url}`);
			error(408, 'Fetch timeout');
		}
		console.error(`Fetch error for ${url}:`, e);
		error(500, 'Error fetching URL');
	}

	assert(responseBodyStream, 'Response body stream is null or undefined');

	// 5. Read Response with Size Limit
	let html = '';
	let bytesRead = 0;
	const reader = responseBodyStream.getReader();
	const decoder = new TextDecoder(); // To decode Uint8Array chunks to string

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			bytesRead += value.byteLength;
			if (bytesRead > maxSizeBytes) {
				reader.cancel(); // Stop reading
				console.error(`Response body limit exceeded for ${url}`);
				// Don't return error to user, just process the partial HTML
				html += decoder.decode(value.slice(0, maxSizeBytes - (bytesRead - value.byteLength)), {
					stream: true
				});
				break; // Exit loop
			}
			html += decoder.decode(value, { stream: true });
		}
		html += decoder.decode(); // Process any remaining buffered data
	} catch (e) {
		console.error(`Error reading response stream for ${url}:`, e);
		// May still have partial HTML, decide if you want to proceed or error out
		error(500, 'Error reading response stream');
	} finally {
		// Ensure the stream is closed if reader.cancel() wasn't called or errored before break
		if (reader && typeof reader.releaseLock === 'function') {
			reader.releaseLock();
		}
	}

	return html;
}
