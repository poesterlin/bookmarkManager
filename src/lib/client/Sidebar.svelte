<script lang="ts">
	import { page } from '$app/state';
	import type { Category } from '$lib/server/db/schema';
	import { IconFolder, IconPlus, IconStack, IconStar, IconWorld } from '@tabler/icons-svelte';

	interface Props {
		handleAddBookmark: () => void;
		categories: Category[];
	}

	let isMenuOpen = $state(false);
	let isSwiping = $state(false);
	let startX = 0;
	let deltaX = $state(0);
	let { handleAddBookmark, categories }: Props = $props();

	function startSwipe(event: PointerEvent) {
		isSwiping = true;
		startX = event.clientX;
	}

	function swipe(event: PointerEvent) {
		if (!isSwiping) return;

		deltaX = event.clientX - startX;
		if (deltaX > 50) {
			isMenuOpen = true;
			isSwiping = false;
		} else if (deltaX < -50) {
			isMenuOpen = false;
			isSwiping = false;
		}
	}

	function endSwipe() {
		isSwiping = false;
		deltaX = 0;
	}
</script>

<svelte:window on:pointerdown={startSwipe} on:pointermove={swipe} on:pointerup={endSwipe} />

<aside
	class="glass {isMenuOpen
		? 'translate-x-0'
		: '-translate-x-full'} fixed z-40 h-[calc(100vh-64px)] w-64 overflow-y-auto transition-transform duration-300 ease-in-out md:relative md:translate-x-0"
		style:transform="translateX({isMenuOpen ? '0' : `calc(-100% + ${deltaX}px)`})"
>
	<div class="p-4">
		<button
			class="button-primary mb-6 flex w-full items-center justify-center"
			onclick={handleAddBookmark}
		>
			<IconPlus class="mr-2" />
			Add Bookmark
		</button>

		<nav class="space-y-1">
			<a
				class="flex w-full items-center rounded-lg px-3 py-2 text-left transition-all
              {Array.from(page.url.searchParams.entries()).length === 0
					? 'bg-primary-100 text-primary-700 font-medium'
					: 'text-gray-700 hover:bg-white/50'}"
				href="/"
			>
				<IconWorld class="mr-2 h-5 w-5" />
				All Bookmarks
			</a>
			<a
				class="flex w-full items-center rounded-lg px-3 py-2 text-left transition-all
              {page.url.searchParams.get('favorite') === ''
					? 'bg-primary-100 text-primary-700 font-medium'
					: 'text-gray-700 hover:bg-white/50'}"
				href="/?favorite"
			>
				<IconStar class="mr-2 h-5 w-5" />
				Favorites
			</a>
		</nav>

		{#if categories.length > 0}
			<div class="mt-6 mb-3">
				<h3 class="px-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
					Categories
				</h3>
			</div>
			<nav class="space-y-1">
				{#each categories as category}
					<a
						href="/?category={category.id}"
						class="flex w-full items-center rounded-lg px-3 py-2 text-left transition-all
                {page.url.searchParams.get('category') === category.id
							? 'bg-secondary-100 text-secondary-700 font-medium'
							: 'text-gray-700 hover:bg-white/50'}"
					>
						<IconFolder class="mr-2 h-5 w-5" />
						{category.name}
					</a>
				{/each}
			</nav>
		{/if}
	</div>
</aside>
