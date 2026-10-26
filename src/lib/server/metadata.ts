/**
 * Site-agnostic cleanup of page titles and descriptions:
 * - removes the site name from the start/end of the title ("… - IKEA Deutschland", "GitHub - …")
 * - removes title parts that the description already says
 * - removes description parts that the title already says, and a trailing sentence that only
 *   advertises the site ("… Contribute to x/y by creating an account on GitHub.")
 */

export interface PageMetadata {
	title: string | null;
	description: string | null;
}

interface Segment {
	text: string;
	/** separator in front of this segment, empty for the first one */
	separator: string;
}

// " | ", " - ", " – ", " — ", " · ", " • ", " » ", and in titles also ": "
const SEPARATOR = /(\s+[|\-–—·•»]\s+)/;
const TITLE_SEPARATOR = /(\s+[|\-–—·•»]\s+|:\s+)/;
/** a title shorter than this is too vague without the site name ("Home", "Login") */
const MIN_TITLE_LENGTH = 8;
/** segments shorter than this are never treated as redundant (avoids matching "a", "UI") */
const MIN_REDUNDANT_LENGTH = 4;
/** titles shorter than this keep the site name */
const MIN_SPECIFIC_LENGTH = 15;
/** site name segments are short, "IKEA Deutschland", "Telekom Hilfe" */
const MAX_SITE_WORDS = 4;

function normalize(text: string) {
	return text
		.toLowerCase()
		.replace(/(\.{3}|…)\s*$/, '')
		.replace(/\s+/g, ' ')
		.replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '')
		.trim();
}

function compact(text: string) {
	return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function split(text: string, separator = SEPARATOR): Segment[] {
	const parts = text.split(separator);
	const segments: Segment[] = [{ text: parts[0], separator: '' }];
	for (let i = 1; i < parts.length; i += 2) {
		segments.push({ separator: parts[i], text: parts[i + 1] ?? '' });
	}
	return segments.filter((s) => s.text.trim().length > 0);
}

function join(segments: Segment[]) {
	return segments
		.map((s, i) => (i === 0 ? s.text : s.separator + s.text))
		.join('')
		.trim();
}

/**
 * The name-like part of a hostname: "docs.wizarr.dev" -> "wizarr", "www.amazon.co.uk" -> "amazon".
 */
function isRootPage(url: string) {
	// "/", "/index.html", and language roots like "/en/" or "/de-DE"
	return (
		URL.canParse(url) && /^\/?([a-z]{2}(-[a-z]{2})?\/?)?(index\.\w+)?$/i.test(new URL(url).pathname)
	);
}

export function siteLabel(url: string): string | null {
	if (!URL.canParse(url)) return null;
	const labels = new URL(url).hostname.replace(/^www\./, '').split('.');
	if (labels.length < 2) return labels[0] || null;
	const secondLevel = labels[labels.length - 2];
	// co.uk, com.au, ...
	if (labels.length >= 3 && secondLevel.length <= 3) {
		return labels[labels.length - 3];
	}
	return secondLevel;
}

/**
 * `exact` only accepts the bare name, optionally with a TLD ("GitHub", "Amazon.de"). Otherwise
 * extra words are allowed too ("IKEA Deutschland", "Telekom Hilfe").
 */
function isSiteName(segment: string, siteNames: string[], exact = false) {
	const words = segment.trim().split(/\s+/);
	if (words.length > MAX_SITE_WORDS) return false;
	const value = compact(segment);
	if (!value) return false;
	if (exact) {
		const bare = segment
			.trim()
			.toLowerCase()
			.replace(/\.[a-z]{2,6}$/, '');
		return siteNames.includes(compact(bare));
	}
	// "IKEA Deutschland" for ikea.com, or an abbreviation like "MDN" for "MDN Web Docs"
	return siteNames.some(
		(name) =>
			value === name || value.startsWith(name) || (value.length >= 3 && name.startsWith(value))
	);
}

/** too vague to stand without the site name ("Home", "Introduction", "Quick Start") */
function isVague(title: string) {
	return title.trim().length < MIN_SPECIFIC_LENGTH;
}

/** true when `text` says nothing that `other` doesn't already say */
function isContainedIn(text: string, other: string) {
	const value = normalize(text);
	return value.length >= MIN_REDUNDANT_LENGTH && normalize(other).includes(value);
}

/**
 * Remove the site name from the title. A leading site name is only removed on sub-pages
 * ("GitHub - owner/repo"); on the root page the site is the subject ("Wokwi - ESP32 Simulator").
 */
function stripSiteName(title: string, siteNames: string[], rootPage: boolean) {
	const segments = split(title, TITLE_SEPARATOR);
	while (!rootPage && segments.length > 1 && isSiteName(segments[0].text, siteNames, true)) {
		segments.shift();
		segments[0] = { ...segments[0], separator: '' };
	}
	while (segments.length > 1 && isSiteName(segments[segments.length - 1].text, siteNames)) {
		segments.pop();
	}
	const result = join(segments);
	return result.length >= MIN_TITLE_LENGTH && !isVague(result) ? result : title;
}

/**
 * Drop title parts after the first one that the description already says. Site names are left
 * to `stripSiteName`, which knows when a title needs them ("Introduction | Wizarr").
 */
function dedupeTitle(title: string, description: string, siteNames: string[]) {
	const [first, ...rest] = split(title, TITLE_SEPARATOR);
	const redundant = (s: Segment) =>
		isContainedIn(s.text, description) && !isSiteName(s.text, siteNames);
	const result = join([first, ...rest.filter((s) => !redundant(s))]);
	return result.length >= MIN_TITLE_LENGTH ? result : title;
}

/** Index where the last sentence starts, sentence ends need whitespace after [.!?] ("eye.rs"). */
function lastSentenceStart(text: string) {
	let start = 0;
	for (const match of text.matchAll(/[.!?]+\s+(?=\S)/g)) {
		start = match.index + match[0].length;
	}
	return start;
}

function cleanDescription(description: string, title: string, siteNames: string[]) {
	let text = description;

	// a trailing sentence mentioning the site is usually boilerplate
	// ("Contribute to x/y development by creating an account on GitHub.")
	const start = lastSentenceStart(text);
	if (start > 0 && siteNames.some((name) => compact(text.slice(start)).includes(name))) {
		text = text.slice(0, start).trim();
	}

	// leading/trailing parts repeating the title or naming the site ("… - owner/repo · GitHub")
	const redundant = (segment: string) =>
		isContainedIn(segment, title) || isSiteName(segment, siteNames);
	// The longest part is the actual description and always stays, so the title gets
	// shortened instead ("owner/repo: Text" + "Text - owner/repo" -> "owner/repo" + "Text").
	const segments = split(text);
	let main = segments.reduce(
		(longest, s, i) => (s.text.length > segments[longest].text.length ? i : longest),
		0
	);
	while (main > 0 && redundant(segments[0].text)) {
		segments.shift();
		segments[0] = { ...segments[0], separator: '' };
		main--;
	}
	while (segments.length - 1 > main && redundant(segments[segments.length - 1].text)) {
		segments.pop();
	}

	return join(segments) || null;
}

export function cleanMetadata(
	url: string,
	metadata: PageMetadata,
	siteName?: string | null
): PageMetadata {
	const siteNames = [siteLabel(url), siteName]
		.filter((name): name is string => !!name)
		.map(compact)
		.filter((name) => name.length >= 3);

	const rawTitle = metadata.title?.replace(/\s+/g, ' ').trim() || null;
	const rawDescription = metadata.description?.replace(/\s+/g, ' ').trim() || null;

	if (!rawTitle) {
		return { title: null, description: rawDescription };
	}

	let title = stripSiteName(rawTitle, siteNames, isRootPage(url));
	let description = rawDescription ? cleanDescription(rawDescription, title, siteNames) : null;
	if (description) {
		title = dedupeTitle(title, description, siteNames);
		// the description says nothing the title doesn't
		if (isContainedIn(description, title)) description = null;
	}

	return { title: title || rawTitle, description };
}
