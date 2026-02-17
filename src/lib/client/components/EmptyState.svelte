<script lang="ts">
	import { page } from '$app/state';
	import { addQueryParam } from '$lib/client/util';
	import type { Category } from '$lib/server/db/schema';
	import { IconArrowRight, IconBookmark, IconFolder } from '@tabler/icons-svelte';

	const {
		addBookmark,
		subcategories = [],
		selectedCategoryName
	}: {
		addBookmark: () => void;
		subcategories?: Category[];
		selectedCategoryName?: string;
	} = $props();

	const isMain = $derived(Array.from(page.url.searchParams.entries()).length === 0);
	const showSubcategoryNav = $derived(
		page.url.searchParams.has('category') && subcategories.length > 0
	);
	const subcategoryCountLabel = $derived(
		`${subcategories.length} sub-categor${subcategories.length === 1 ? 'y' : 'ies'}`
	);
</script>

{#snippet fallbackIcon()}
	<div class="animate-float mx-auto mb-6 h-32 w-32">
		<IconBookmark
			class="animate-float text-primary-200 dark:text-primary-600/50 h-32 w-32"
			style="animation-duration: 2s; animation-delay: 0.5s"
		></IconBookmark>
	</div>
{/snippet}

<div
	class="mt-12 flex flex-col items-center text-center"
	class:glass={!showSubcategoryNav}
	class:rounded-xl={!showSubcategoryNav}
	class:p-8={!showSubcategoryNav}
>
	{#if showSubcategoryNav}
		<p
			class="text-secondary-700 dark:text-secondary-300 mb-1 text-[11px] font-semibold tracking-[0.14em] uppercase"
		>
			Explore
		</p>
		<h3
			class="mb-2 text-2xl leading-tight font-semibold tracking-tight text-gray-900 dark:text-gray-100"
		>
			{subcategoryCountLabel}
		</h3>
		<div
			class="mx-auto mb-6 grid w-full max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-3"
		>
			{#each subcategories as subcategory (subcategory.id)}
				<a
					data-sveltekit-replacestate
					href={addQueryParam(page.url, 'category', subcategory.id)}
					class="group border-secondary-200/60 hover:border-secondary-300 flex items-center gap-3 rounded-xl border bg-white/80 p-4 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-gray-700 dark:bg-gray-900/80 hover:dark:border-gray-500 dark:hover:bg-gray-900/95 dark:hover:shadow-black/30"
				>
					<div
						class="bg-secondary-100 text-secondary-700 rounded-lg p-2 dark:bg-gray-800 dark:text-gray-200"
					>
						<IconFolder class="h-4 w-4" />
					</div>
					<div class="min-w-0 flex-1">
						<div
							class="truncate text-[15px] leading-snug font-semibold text-gray-900 dark:text-gray-100"
						>
							{subcategory.name}
						</div>
						<div
							class="mt-0.5 text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-300"
						>
							Sub-category
						</div>
					</div>
					<IconArrowRight
						class="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 dark:text-gray-300"
					/>
				</a>
			{/each}
		</div>
	{:else if isMain}
		{@render fallbackIcon()}
		<h3 class="mb-2 text-xl font-bold text-gray-800 dark:text-gray-200">No bookmarks found</h3>
		<p class="mx-auto mb-6 max-w-sm text-gray-600 dark:text-gray-400">
			Start adding bookmarks to your collection to see them here.
		</p>
		<button class="button-primary" onclick={addBookmark}> Add Your First Bookmark </button>
	{:else}
		{@render fallbackIcon()}
		<h3 class="mb-2 text-xl font-bold text-gray-800 dark:text-gray-200">No bookmarks found</h3>

		<p class="mx-auto mb-6 max-w-sm text-gray-600 dark:text-gray-400">
			No bookmarks found with the selected filter. Try removing the filter or adding a new bookmark.
		</p>
		<button class="button-primary" onclick={addBookmark}> Add Bookmark </button>
	{/if}
</div>
