import { assert, validateAuth } from '$lib/server/util';
import { validateAuthHeader, corsHeaders, getCorsResponse } from '$lib/server/auth';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { JSDOM } from 'jsdom';
import { error, isHttpError, json } from '@sveltejs/kit';
import { cleanMetadata } from '$lib/server/metadata';
import { safeFetch, UnsafeUrlError } from '$lib/server/safe-fetch';

const schema = z.object({
	url: z.string().url().trim()
});

export const POST: RequestHandler = async (event) => {
	const authHeader = event.request.headers.get('Authorization');
	if (authHeader?.startsWith('Bearer ')) {
		await validateAuthHeader(event);
	} else {
		validateAuth(event);
	}

	const form = await event.request.json();
	const parsed = schema.safeParse(form);

	if (!parsed.success) {
		return json(
			{
				error: { code: 'VALIDATION_ERROR', message: 'Invalid URL', fields: { url: 'Invalid URL' } }
			},
			{ status: 400, headers: corsHeaders }
		);
	}

	const { url } = parsed.data;
	const sanitizedUrl = sanitizeUrl(url);

	let text: string;
	try {
		text = await fetchWithSizeLimit(sanitizedUrl.toString());
	} catch (e) {
		if (e instanceof UnsafeUrlError) {
			return json(
				{ error: { code: 'INVALID_URL', message: e.message, fields: { url: e.message } } },
				{ status: 400, headers: corsHeaders }
			);
		}
		throw e;
	}
	const { siteName, ...data } = parseHTML(text);
	// drop the site name and parts the title and description repeat from each other
	Object.assign(data, cleanMetadata(sanitizedUrl.toString(), data, siteName));

	if (data.favicon && URL.canParse(data.favicon, sanitizedUrl)) {
		const fullFaviconUrl = new URL(data.favicon, sanitizedUrl);
		data.faviconData = await fetchFaviconBase64(fullFaviconUrl);
	}

	return json(data, { headers: corsHeaders });
};

export const OPTIONS: RequestHandler = getCorsResponse;

/**
 * Sanitize the URL to ensure it is a valid HTTPS URL and strip tracking parameters and fragments.
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

	// Keep the query (e.g. YouTube's ?v=), only drop tracking parameters, credentials and the
	// fragment.
	const sanitized = new URL(`${protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`);
	for (const [key, value] of parsedUrl.searchParams) {
		if (!TRACKING_PARAM.test(key)) sanitized.searchParams.append(key, value);
	}
	return sanitized;
}

const TRACKING_PARAM = /^(utm_\w+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|ref_src)$/i;

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
		response = await safeFetch(urlString, {
			signal: AbortSignal.timeout(2000),
			headers: {
				Accept: 'image/*'
			}
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
		if (!(e instanceof Error)) {
			return undefined;
		}
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
		// only keep the media type, drop parameters like charset
		const fileType = (response.headers.get('content-type') ?? 'image/png')
			.split(';')[0]
			.trim()
			.toLowerCase();
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
function parseHTML(html: string) {
	// JSDOM does not execute scripts unless `runScripts` is set
	const dom = new JSDOM(html);
	const doc = dom.window.document;

	const meta = (selector: string) => doc.querySelector(selector)?.getAttribute('content')?.trim();
	// Open Graph tags are spec'd as property="og:…", but some sites use name="og:…"
	const og = (key: string) => meta(`meta[property='og:${key}'], meta[name='og:${key}']`);

	const title = doc.querySelector('title')?.textContent?.trim() || og('title') || null;
	const description = meta("meta[name='description']") || og('description') || null;
	// rel is a token list, e.g. "shortcut icon"
	const favicon =
		doc.querySelector("link[rel~='icon']")?.getAttribute('href') ??
		doc.querySelector("link[rel='apple-touch-icon']")?.getAttribute('href') ??
		'/favicon.ico';
	const theme = meta("meta[name='theme-color']") ?? null;
	const siteName = og('site_name') || meta("meta[name='application-name']") || null;

	return {
		title,
		description,
		favicon,
		theme,
		siteName,
		faviconData: undefined as undefined | string
	};
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
		response = await safeFetch(url, {
			signal: AbortSignal.timeout(5000),
			headers: {
				Accept: 'text/html'
			}
		});

		if (!response.ok) {
			console.error(`Fetch failed for ${url}: ${response.status}`);
			error(400, 'Invalid URL');
		}

		const contentType = response.headers.get('content-type');
		if (!contentType || !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
			console.warn(`Unexpected Content-Type for ${url}: ${contentType}`);
			error(400, 'Invalid Content-Type');
		}

		responseBodyStream = response.body;
	} catch (e: unknown) {
		// let SvelteKit errors and SSRF rejections through unchanged
		if (isHttpError(e) || e instanceof UnsafeUrlError) {
			throw e;
		}
		if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
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
				await reader.cancel(); // Stop reading
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
