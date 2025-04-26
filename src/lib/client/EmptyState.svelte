<script lang="ts">
	import { page } from '$app/state';
	import { IconBookmark } from '@tabler/icons-svelte';

	const { addBookmark }: {addBookmark: ()=> void} = $props();

	const isMain = $derived(Array.from(page.url.searchParams.entries()).length === 0);
</script>

<div class="glass flex flex-col items-center rounded-xl p-8 text-center">
	<div class="animate-float mx-auto mb-6 h-32 w-32">
		<IconBookmark
			class="h-32 w-32 animate-float text-primary-200 dark:text-primary-600/50"
			style="animation-duration: 2s; animation-delay: 0.5s"></IconBookmark>
	</div>

	<h3 class="mb-2 text-xl font-bold text-gray-800 dark:text-gray-200">
	No bookmarks found</h3>
	{#if isMain}
		<p class="mx-auto mb-6 max-w-sm text-gray-600 dark:text-gray-400">
			Start adding bookmarks to your collection to see them here.
		</p>
		<button class="button-primary" onclick={addBookmark}> Add Your First Bookmark </button>
	{:else}
		<p class="mx-auto mb-6 max-w-sm text-gray-600 dark:text-gray-400">
			No bookmarks found with the selected filter. Try removing the filter or adding a new bookmark.
		</p>
		<button class="button-primary" onclick={addBookmark}> Add Bookmark </button>
	{/if}
</div>
