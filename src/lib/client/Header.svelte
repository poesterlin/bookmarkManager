<script lang="ts">
	import { page } from '$app/state';
	import type { Bookmark } from '$lib/server/db/schema';
	import { IconSearch, IconUserCircle, IconX } from '@tabler/icons-svelte';
	import { searchStore } from './search.svelte';

	let searchQuery = $state('');
	let abortController: AbortController | null = null;

	$effect(() => {
		if (abortController) {
			abortController.abort();
		}

		if (!searchQuery || searchQuery.trim() === '' || searchQuery.length < 2) {
			searchStore.clear();
			return;
		}

		abortController = new AbortController();
		const signal = abortController.signal;

		const search = async () => {
			try {
				const response = await fetch(`/search?query=${searchQuery}`, { signal });
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				const data = (await response.json()) as Bookmark[];
				searchStore.results = data;
				console.log('Search results:', data);
			} catch (error: any) {
				if (error.name !== 'AbortError') {
					console.error('Fetch error:', error);
				}
			}
		};

		search();
	});
</script>

<header class="glass sticky top-0 z-50 px-4 py-3">
	<a class="flex items-center justify-center" href="/">
		<span class="text-primary-500 mr-1 hidden text-2xl font-bold md:block">Bookmark</span>
		<span class="text-primary-500 mr-1 text-2xl font-bold md:hidden">B</span>
		<span class="text-secondary-500 hidden text-2xl font-bold md:block">Manager</span>
		<span class="text-secondary-500 text-2xl font-bold md:hidden">M</span>
  </a>

	<div
		class="input mx-auto focus-within:!border-primary-500 relative flex max-w-lg w-[70%] min-w-min flex-1 items-center gap-1 !p-0 focus-within:!ring-0"
	>
		<IconSearch class="ml-3 text-gray-500" size={20} stroke-width={1.5} />
		<input
			type="text"
			placeholder="Search bookmarks..."
			class="w-full border-none bg-transparent p-2 focus:outline-none"
			bind:value={searchQuery}
		/>
		{#if searchQuery}
			<button
				type="button"
				class="absolute right-2 text-gray-500 hover:text-gray-700"
				onclick={() => {
					searchQuery = '';
					searchStore.clear();
				}}
			>
				<IconX size={20} stroke-width={1.5} />
			</button>
		{/if}
	</div>

	<div class="flex items-center justify-end">
		<a href="/profile" aria-current={page.url.pathname === '/profile'} title="Profile">
			<IconUserCircle class="m-auto h-8 w-8 -translate-y-0.5 text-slate-500"></IconUserCircle>
		</a>
	</div>
</header>

<style>
	header {
		display: grid;
    gap: 1rem;
		grid-template-columns: 1fr minmax(auto, 75%) 1fr;
	}
</style>
