import { validateAuth } from '$lib/server/util';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { JSDOM } from 'jsdom';
import { json } from '@sveltejs/kit';

const schema = z.object({
	url: z.string().url()
});

export const POST: RequestHandler = async (event) => {
	validateAuth(event);

	const form = await event.request.json();
	const { url } = schema.parse(form);

	const res = await fetch(url);
	if (!res.ok) {
		return new Response('Invalid URL', { status: 400 });
	}
	const text = await res.text();

	// Create a JSDOM instance
	const dom = new JSDOM(text);
	const doc = dom.window.document; // Access the document object

	// Query the elements - almost identical to your original code
	const title = doc.querySelector('title')?.textContent ?? null;
	const description =
		doc.querySelector("meta[name='description']")?.getAttribute('content') ?? null;
	const favicon = doc.querySelector("link[rel='icon']")?.getAttribute('href') ?? null;
	// You might want to look for other rel values too, like 'shortcut icon' or 'apple-touch-icon'
	// const favicon = doc.querySelector("link[rel='icon'], link[rel='shortcut icon']")?.getAttribute('href') ?? null;
	const theme = doc.querySelector("meta[name='theme-color']")?.getAttribute('content') ?? null;

	const data = { title, description, favicon, theme, faviconData: undefined as undefined | string };
	if (favicon) {
		const fullFaviconUrl = new URL(favicon, url);

		const res = await fetch(fullFaviconUrl.toString(), { method: 'GET' });
		const icon = await res.arrayBuffer();
		const buffer = Buffer.from(icon);
		const base64 = buffer.toString('base64');
		const fileType = res.headers.get('Content-Type');
		data.faviconData = `data:${fileType ?? 'image/png'};base64,` + base64;
	}

	return json(data);
};
