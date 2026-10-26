import { describe, it, expect } from 'bun:test';
import { cleanMetadata, siteLabel } from '../metadata';

const clean = (url: string, title: string, description: string | null = null, siteName?: string) =>
	cleanMetadata(url, { title, description }, siteName);

describe('siteLabel()', () => {
	it('returns the name part of the hostname', () => {
		expect(siteLabel('https://docs.wizarr.dev/x')).toBe('wizarr');
		expect(siteLabel('https://www.amazon.co.uk/x')).toBe('amazon');
		expect(siteLabel('https://github.com/a/b')).toBe('github');
	});
});

describe('cleanMetadata()', () => {
	it('moves a repeated description out of the title', () => {
		expect(
			clean(
				'https://github.com/th-ch/youtube-music',
				'GitHub - th-ch/youtube-music: YouTube Music Desktop App bundled with custom plugins',
				'YouTube Music Desktop App bundled with custom plugins - th-ch/youtube-music'
			)
		).toEqual({
			title: 'th-ch/youtube-music',
			description: 'YouTube Music Desktop App bundled with custom plugins'
		});
	});

	it('removes a trailing sentence advertising the site', () => {
		expect(
			clean(
				'https://github.com/YaLTeR/niri',
				'GitHub - YaLTeR/niri: A scrollable-tiling Wayland compositor.',
				'A scrollable-tiling Wayland compositor. Contribute to YaLTeR/niri development by creating an account on GitHub.'
			)
		).toEqual({ title: 'YaLTeR/niri', description: 'A scrollable-tiling Wayland compositor.' });
	});

	it('keeps sub-page context and strips the site suffix', () => {
		expect(
			clean(
				'https://github.com/sambenko/esp32s3-box-examples/blob/main/examples/eye.rs',
				'esp32s3-box-examples/examples/eye.rs at main · sambenko/esp32s3-box-examples · GitHub',
				'A repository of examples for esp32s3-box written in Rust - esp32s3-box-examples/examples/eye.rs at main · sambenko/esp32s3-box-examples'
			)
		).toEqual({
			title: 'esp32s3-box-examples/examples/eye.rs at main · sambenko/esp32s3-box-examples',
			description: 'A repository of examples for esp32s3-box written in Rust'
		});
	});

	it('strips site name suffixes, also longer ones', () => {
		expect(
			clean('https://www.ikea.com/de/de/p/x', 'VARIERA Deckelhalter, Edelstahl - IKEA Deutschland')
				.title
		).toBe('VARIERA Deckelhalter, Edelstahl');
		expect(
			clean('https://www.telekom.de/hilfe/x', 'Sonderkündigung bei Umzug | Telekom Hilfe').title
		).toBe('Sonderkündigung bei Umzug');
		expect(clean('https://example.com/post', 'A post title', null, 'Some Blog').title).toBe(
			'A post title'
		);
	});

	it('strips an abbreviated site name suffix', () => {
		expect(
			clean(
				'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog',
				'<dialog> HTML dialog element | MDN',
				null,
				'MDN Web Docs'
			).title
		).toBe('<dialog> HTML dialog element');
	});

	it('strips a site name prefix, also with TLD', () => {
		expect(clean('https://www.amazon.de/dp/x', 'Amazon.de: ELFCAM Invisible Cables').title).toBe(
			'ELFCAM Invisible Cables'
		);
	});

	it('keeps the leading name on a home page', () => {
		expect(clean('https://wokwi.com/', "Wokwi - World's most advanced ESP32 Simulator").title).toBe(
			"Wokwi - World's most advanced ESP32 Simulator"
		);
		expect(clean('https://www.citedrive.com/en/', 'CiteDrive: BibTeX Management').title).toBe(
			'CiteDrive: BibTeX Management'
		);
	});

	it('only strips an exact site name from the start', () => {
		// "Gridfinity Generator" is the home page's subject
		expect(
			clean('https://gridfinitygenerator.com/en', 'Gridfinity Generator | Interactive tool').title
		).toBe('Gridfinity Generator | Interactive tool');
		// a product name that merely starts with the domain name is not the site name
		expect(
			clean('https://gridfinity.xyz/tools/x', 'Gridfinity Generator | Interactive tool').title
		).toBe('Gridfinity Generator | Interactive tool');
	});

	it('keeps the site name when the rest would be too vague', () => {
		expect(clean('https://docs.wizarr.dev/intro', 'Introduction | Wizarr').title).toBe(
			'Introduction | Wizarr'
		);
		expect(clean('https://example.com/x', 'Home - Example').title).toBe('Home - Example');
		// also when the description mentions the site
		expect(
			clean(
				'https://docs.wizarr.dev/',
				'Introduction | Wizarr',
				'Welcome to the Wizarr Documentation'
			).title
		).toBe('Introduction | Wizarr');
	});

	it('drops a description that only repeats the title', () => {
		expect(
			clean(
				'https://github.com/rishikanthc/zendo',
				'Self-hosted minimalistic task manager',
				'Self-hosted minimalistic task manager. Contribute to rishikanthc/zendo development by creating an account on GitHub.'
			)
		).toEqual({ title: 'Self-hosted minimalistic task manager', description: null });
	});

	it('does not split inside file names or domains', () => {
		expect(
			clean(
				'https://example.com/x',
				'Some page title',
				'See eye.rs and www.youtube.com for details. More text.'
			).description
		).toBe('See eye.rs and www.youtube.com for details. More text.');
	});

	it('handles missing values', () => {
		expect(clean('https://example.com/x', '')).toEqual({ title: null, description: null });
		expect(cleanMetadata('not a url', { title: 'A title here', description: null })).toEqual({
			title: 'A title here',
			description: null
		});
	});
});
