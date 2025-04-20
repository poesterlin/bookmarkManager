<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import BookmarkCard from './BookmarkCard.svelte';
	import EmptyState from './EmptyState.svelte';
	import type { Bookmark } from '$lib/server/db/schema';

	// export let bookmarks: Bookmark[] = [];
	const { bookmarks, addBookmark }: { bookmarks: Bookmark[]; addBookmark: () => void } = $props();
</script>

<div class="fade-in space-y-4">
	{#if bookmarks.length === 0}
		<EmptyState {addBookmark} />
	{:else}
		<div class="grid-cols-cards grid gap-4">
			{#each bookmarks as bookmark (bookmark.id)}
				<div
					class="group glass row-span-3 grid grid-rows-subgrid rounded-xl p-4 transition-all duration-300 hover:shadow-xl"
					animate:flip={{ duration: 300 }}
					in:fly={{ y: 20, duration: 300, delay: 100 }}
					out:fade={{ duration: 200 }}
				>
					<BookmarkCard {bookmark} />
				</div>
			{/each}
		</div>
	{/if}
</div>
