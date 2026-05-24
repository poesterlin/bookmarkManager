<script lang="ts">
	import {
		IconLoader,
		IconExternalLink,
		IconCopy,
		IconTrash,
		IconSearch,
		IconX
	} from '@tabler/icons-svelte';
	import { createApi, ApiError } from '../../lib/api';
	import { showToast } from './toast.svelte';

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
	let deleting = $state<string | null>(null);

	const api = createApi(() => token);

	function filterBookmarks() {
		if (!searchQuery.trim()) {
			filteredBookmarks = bookmarks;
		} else {
			const query = searchQuery.toLowerCase();
			filteredBookmarks = bookmarks.filter(
				(b) => b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query)
			);
		}
	}

	async function fetchBookmarks() {
		try {
			loading = true;
			error = null;

			const data = await api.get<{ bookmarks: Bookmark[] }>('/api/bookmarks');
			bookmarks = data.bookmarks || [];
			filterBookmarks();
		} catch (err: unknown) {
			if (err instanceof ApiError) {
				if (!err.isAuthError) {
					error = err.message;
				}
			} else {
				error = 'Failed to load bookmarks';
			}
		} finally {
			loading = false;
		}
	}

	async function deleteBookmark(id: string) {
		const bookmark = bookmarks.find((b) => b.id === id);
		const removedIndex = bookmarks.findIndex((b) => b.id === id);
		if (removedIndex === -1) return;

		// Optimistic removal
		const removed = bookmarks[removedIndex];
		bookmarks = bookmarks.filter((b) => b.id !== id);
		filterBookmarks();
		deleting = id;

		try {
			await api.delete(`/api/bookmarks/${id}`);
			showToast('Bookmark deleted', 'success');
		} catch (err: unknown) {
			// Rollback on failure
			bookmarks = [...bookmarks.slice(0, removedIndex), removed, ...bookmarks.slice(removedIndex)];
			filterBookmarks();
			if (err instanceof ApiError) {
				if (!err.isAuthError) {
					showToast('Failed to delete bookmark', 'error');
				}
			}
		} finally {
			deleting = null;
		}
	}

	async function copyUrl(url: string, id: string) {
		try {
			await navigator.clipboard.writeText(url);
			copied = id;
			setTimeout(() => {
				copied = null;
			}, 2000);
		} catch (err: unknown) {
			showToast('Failed to copy URL', 'error');
		}
	}

	function visitBookmark(url: string) {
		browser.tabs.create({ url });
	}

	onMount(() => {
		fetchBookmarks();
	});
</script>

<div
	class="flex h-full flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950"
>
	<!-- Search Bar -->
	<div
		class="sticky top-0 z-10 border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
	>
		<div class="relative flex items-center">
			<IconSearch class="absolute left-3 h-4 w-4 text-gray-400" />
			<input
				type="text"
				placeholder="Search bookmarks..."
				bind:value={searchQuery}
				onchange={filterBookmarks}
				oninput={filterBookmarks}
				class="focus:ring-primary-500 dark:focus:ring-primary-400 w-full rounded-lg border border-gray-300 bg-white py-2 pr-10 pl-10 text-gray-900 placeholder-gray-500 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
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
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<IconLoader class="text-primary-500 mx-auto mb-2 h-8 w-8 animate-spin" />
				<p class="text-sm text-gray-600 dark:text-gray-400">Loading bookmarks...</p>
			</div>
		</div>
	{:else if error}
		<div class="flex flex-1 items-center justify-center p-4">
			<div class="text-center">
				<p class="mb-3 text-sm text-red-600 dark:text-red-400">Failed to load bookmarks</p>
				<button onclick={fetchBookmarks} class="button-primary text-sm"> Try Again </button>
			</div>
		</div>
	{:else if bookmarks.length === 0}
		<div class="flex flex-1 items-center justify-center p-4">
			<div class="text-center">
				<div class="mb-3 text-4xl">📚</div>
				<p class="text-sm font-medium text-gray-900 dark:text-white">No bookmarks yet</p>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Start adding bookmarks to see them here
				</p>
			</div>
		</div>
	{:else if filteredBookmarks.length === 0}
		<div class="flex flex-1 items-center justify-center p-4">
			<div class="text-center">
				<div class="mb-3 text-4xl">🔍</div>
				<p class="text-sm text-gray-600 dark:text-gray-400">No bookmarks match "{searchQuery}"</p>
			</div>
		</div>
	{:else}
		<div class="flex-1 overflow-y-auto px-3 py-3">
			<div class="space-y-2">
				{#each filteredBookmarks as bookmark (bookmark.id)}
					<div
						class="group hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-all duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:shadow-lg"
					>
						<!-- Header with Title and Favicon -->
						<div class="mb-2 flex gap-2.5">
							{#if bookmark.favicon}
								<img
									src={bookmark.favicon}
									alt="favicon"
									class="mt-0.5 h-5 w-5 flex-shrink-0 rounded object-cover"
								/>
							{:else}
								<div
									class="from-primary-400 to-primary-600 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br text-xs font-bold text-white"
								>
									{bookmark.title.charAt(0).toUpperCase()}
								</div>
							{/if}
							<div class="min-w-0 flex-1">
								<h4
									class="truncate text-sm leading-tight font-semibold text-gray-900 dark:text-gray-100"
								>
									{bookmark.title}
									{#if deleting === bookmark.id}
										<span class="ml-2 text-xs text-gray-400">Deleting...</span>
									{/if}
								</h4>
								<p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
									{new URL(bookmark.url).hostname}
								</p>
							</div>
						</div>

						<!-- Description -->
						{#if bookmark.description}
							<p class="mb-2 ml-7 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
								{bookmark.description}
							</p>
						{/if}

						<!-- Category Badge -->
						{#if bookmark.category}
							<div class="mb-3 ml-7">
								<span
									class="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
								>
									{bookmark.category.name}
								</span>
							</div>
						{/if}

						<!-- Actions -->
						<div
							class="ml-7 flex gap-2 pt-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
						>
							<button
								onclick={() => visitBookmark(bookmark.url)}
								title="Open bookmark in new tab"
								class="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50 flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium transition-colors"
							>
								<IconExternalLink size={14} />
								<span>Visit</span>
							</button>
							<button
								onclick={() => copyUrl(bookmark.url, bookmark.id)}
								title="Copy URL to clipboard"
								class="flex flex-1 items-center justify-center gap-1 rounded bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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
								disabled={deleting === bookmark.id}
								class="flex items-center justify-center rounded p-1.5 text-xs text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30"
							>
								{#if deleting === bookmark.id}
									<IconLoader size={14} class="animate-spin" />
								{:else}
									<IconTrash size={14} />
								{/if}
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Footer with count -->
		<div
			class="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
		>
			Showing {filteredBookmarks.length} of {bookmarks.length}
			{bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
		</div>
	{/if}
</div>
