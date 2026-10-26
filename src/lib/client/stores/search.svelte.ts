import type { Bookmark } from '$lib/server/db/schema';

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;

class SearchStore {
	query = $state('');
	/** null while no search is active, an empty array means "no results" */
	results = $state<Bookmark[] | null>(null);
	loading = $state(false);

	private controller: AbortController | null = null;
	private timer: ReturnType<typeof setTimeout> | null = null;

	get active() {
		return this.query.trim().length >= MIN_QUERY_LENGTH;
	}

	/** Schedule a search for the current query, cancelling any pending one. */
	run(immediate = false) {
		this.cancel();

		if (!this.active) {
			this.results = null;
			return;
		}

		const query = this.query.trim();
		this.timer = setTimeout(() => this.fetch(query), immediate ? 0 : DEBOUNCE_MS);
	}

	/** Re-run the active search, e.g. after the bookmarks changed. */
	refresh() {
		if (this.active) this.run(true);
	}

	clear() {
		this.cancel();
		this.query = '';
		this.results = null;
	}

	/** Apply an optimistic edit to a bookmark in the current results. */
	patch(id: string, changes: Partial<Bookmark>) {
		const bookmark = this.results?.find((b) => b.id === id);
		if (bookmark) Object.assign(bookmark, changes);
	}

	private cancel() {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
		this.controller?.abort();
		this.controller = null;
		this.loading = false;
	}

	private async fetch(query: string) {
		const controller = new AbortController();
		this.controller = controller;
		this.loading = true;

		try {
			const response = await fetch(`/search?query=${encodeURIComponent(query)}`, {
				signal: controller.signal
			});
			if (!response.ok) {
				throw new Error(`Search failed: ${response.status}`);
			}
			const results = (await response.json()) as Bookmark[];
			// ignore responses for queries that were replaced in the meantime
			if (this.controller === controller) {
				this.results = results;
			}
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError')) {
				console.error('Search error:', error);
			}
		} finally {
			if (this.controller === controller) {
				this.loading = false;
				this.controller = null;
			}
		}
	}
}

export const searchStore = new SearchStore();
