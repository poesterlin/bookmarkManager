import type { Bookmark } from '$lib/server/db/schema';

class SearchResults {
	results = $state([] as Bookmark[]);

	isIncluded(id: string) {
		return this.results.some((bookmark) => bookmark.id === id);
	}

	clear() {
		this.results.length = 0;
	}

	isSet() {
		return this.results.length > 0;
	}
}

export const searchStore = new SearchResults();
