<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import BookmarkCard from './BookmarkCard.svelte';
	import EmptyState from './EmptyState.svelte';
	import type { Bookmark } from '$lib/server/db/schema';
	import { searchStore } from './search.svelte';
	import { page } from '$app/state';


	let {
		bookmarks,
		addBookmark,
	}: { bookmarks: Bookmark[]; addBookmark: () => void;} = $props();

	let list = $derived(searchStore.isSet() ? searchStore.results : bookmarks);
</script>



<div class="fade-in space-y-4">
	{#if bookmarks.length === 0}
		<EmptyState {addBookmark} />
	{:else}
		<div class="grid-cols-cards grid gap-4" >
			{#each list as bookmark (bookmark.id)}
				<div
					class="glass row-span-3 grid grid-rows-subgrid rounded-xl p-4 transition-all duration-300 hover:shadow-xl"
					animate:flip={{ duration: 250 }}
					class:archived={bookmark.deletedAt && !page.url.searchParams.has('archived')}
				>
					<BookmarkCard {bookmark} />
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.archived {
		opacity: 0.9;
		position: relative;
		filter: saturate(0.6);
		background: linear-gradient(135deg, #e9e1f9 3%, rgb(233, 233, 233) 6%, transparent 12%);

		:global(img) {
			opacity: 0.3;
		}
	}

	:global(.dark) .archived {
		background: linear-gradient(135deg, #1f1f1f 3%, rgb(30, 30, 30) 6%, transparent 12%);
	}
</style>
