<script lang="ts">
	import { IconLoader, IconExternalLink, IconCopy, IconTrash, IconSearch, IconX } from '@tabler/icons-svelte';

	interface Bookmark {
		id: string;
		title: string;
		url: string;
		description?: string;
		favicon?: string;
		category?: {
			id: string;
			name: string;
		};
	}

	const { token }: { token: string } = $props();

	let bookmarks: Bookmark[] = $state([]);
	let filteredBookmarks: Bookmark[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let copied = $state<string | null>(null);
	let searchQuery = $state('');

	function filterBookmarks() {
		if (!searchQuery.trim()) {
			filteredBookmarks = bookmarks;
		} else {
			const query = searchQuery.toLowerCase();
			filteredBookmarks = bookmarks.filter((b) =>
				b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query)
			);
		}
	}

	async function fetchBookmarks() {
		try {
			loading = true;
			error = null;

			const response = await fetch(import.meta.env.VITE_HOST + '/api/bookmarks', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to fetch bookmarks');
			}

			const data = await response.json();
			bookmarks = data.bookmarks || [];
			filterBookmarks();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load bookmarks';
			console.error('Error fetching bookmarks:', err);
		} finally {
			loading = false;
		}
	}

	async function deleteBookmark(id: string) {
		try {
			const response = await fetch(import.meta.env.VITE_HOST + `/api/bookmarks/${id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to delete bookmark');
			}

			bookmarks = bookmarks.filter((b) => b.id !== id);
			filterBookmarks();
		} catch (err) {
			console.error('Error deleting bookmark:', err);
		}
	}

	async function copyUrl(url: string, id: string) {
		try {
			await navigator.clipboard.writeText(url);
			copied = id;
			setTimeout(() => {
				copied = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function visitBookmark(url: string) {
		browser.tabs.create({ url });
	}

	onMount(() => {
		fetchBookmarks();
	});
</script>

<div class="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
	<!-- Search Bar -->
	<div class="sticky top-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
		<div class="relative flex items-center">
			<IconSearch class="absolute left-3 h-4 w-4 text-gray-400" />
			<input
				type="text"
				placeholder="Search bookmarks..."
				bind:value={searchQuery}
				onchange={filterBookmarks}
				oninput={filterBookmarks}
				class="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
			/>
			{#if searchQuery}
				<button
					onclick={() => {
						searchQuery = '';
						filterBookmarks();
					}}
					class="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
				>
					<IconX size={18} />
				</button>
			{/if}
		</div>
	</div>

	<!-- Content -->
	{#if loading}
		<div class="flex items-center justify-center flex-1">
			<div class="text-center">
				<IconLoader class="h-8 w-8 animate-spin text-primary-500 mx-auto mb-2" />
				<p class="text-sm text-gray-600 dark:text-gray-400">Loading bookmarks...</p>
			</div>
		</div>
	{:else if error}
		<div class="flex items-center justify-center flex-1 p-4">
			<div class="text-center">
				<p class="text-sm text-red-600 dark:text-red-400 mb-3">⚠️ {error}</p>
				<button onclick={fetchBookmarks} class="button-primary text-sm"> Try Again </button>
			</div>
		</div>
	{:else if bookmarks.length === 0}
		<div class="flex items-center justify-center flex-1 p-4">
			<div class="text-center">
				<div class="text-4xl mb-3">📚</div>
				<p class="text-sm font-medium text-gray-900 dark:text-white">No bookmarks yet</p>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Start adding bookmarks to see them here</p>
			</div>
		</div>
	{:else if filteredBookmarks.length === 0}
		<div class="flex items-center justify-center flex-1 p-4">
			<div class="text-center">
				<div class="text-4xl mb-3">🔍</div>
				<p class="text-sm text-gray-600 dark:text-gray-400">No bookmarks match "{searchQuery}"</p>
			</div>
		</div>
	{:else}
		<div class="flex-1 overflow-y-auto px-3 py-3">
			<div class="space-y-2">
				{#each filteredBookmarks as bookmark (bookmark.id)}
					<div
						class="group p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md dark:hover:shadow-lg transition-all duration-200 cursor-pointer"
					>
						<!-- Header with Title and Favicon -->
						<div class="flex gap-2.5 mb-2">
							{#if bookmark.favicon}
								<img
									src={bookmark.favicon}
									alt="favicon"
									class="h-5 w-5 rounded flex-shrink-0 mt-0.5 object-cover"
								/>
							{:else}
								<div
									class="h-5 w-5 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 bg-gradient-to-br from-primary-400 to-primary-600"
								>
									{bookmark.title.charAt(0).toUpperCase()}
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
									{bookmark.title}
								</h4>
								<p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
									{new URL(bookmark.url).hostname}
								</p>
							</div>
						</div>

						<!-- Description -->
						{#if bookmark.description}
							<p class="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2 ml-7">
								{bookmark.description}
							</p>
						{/if}

						<!-- Category Badge -->
						{#if bookmark.category}
							<div class="mb-3 ml-7">
								<span
									class="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium"
								>
									{bookmark.category.name}
								</span>
							</div>
						{/if}

						<!-- Actions -->
						<div class="flex gap-2 pt-2 ml-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
							<button
								onclick={() => visitBookmark(bookmark.url)}
								title="Open bookmark in new tab"
								class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
							>
								<IconExternalLink size={14} />
								<span>Visit</span>
							</button>
							<button
								onclick={() => copyUrl(bookmark.url, bookmark.id)}
								title="Copy URL to clipboard"
								class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
							>
								{#if copied === bookmark.id}
									<span class="text-green-600 dark:text-green-400">✓</span>
									<span>Copied</span>
								{:else}
									<IconCopy size={14} />
									<span>Copy</span>
								{/if}
							</button>
							<button
								onclick={() => deleteBookmark(bookmark.id)}
								title="Delete bookmark"
								class="flex items-center justify-center p-1.5 text-xs rounded text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
							>
								<IconTrash size={14} />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Footer with count -->
		<div class="sticky bottom-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400">
			Showing {filteredBookmarks.length} of {bookmarks.length}
			{bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
		</div>
	{/if}
</div>
