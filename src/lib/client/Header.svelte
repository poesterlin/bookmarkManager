<script lang="ts">
	import { page } from '$app/state';
	import type { Bookmark } from '$lib/server/db/schema';
	import { IconMoon, IconSearch, IconUserCircle, IconX } from '@tabler/icons-svelte';
	import { searchStore } from './search.svelte';
	import { onMount } from 'svelte';

	let searchQuery = $state('');
	let abortController: AbortController | null = null;

	let { isScrolled } = $props();

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

	function toggleDarkMode() {
		const darkModeEnabled =
			localStorage.theme === 'dark' ||
			(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

		document.documentElement.classList.toggle('dark', !darkModeEnabled);
		localStorage.theme = darkModeEnabled ? 'light' : 'dark';
	}
</script>

<header class="border-secondary-200/20 z-40 border-b-2 px-4 py-3" class:shadow={isScrolled}>
	<a class="flex items-center justify-center" href="/">
		<span class="text-primary-500 mr-1 hidden text-2xl font-bold md:block">Bookmark</span>
		<span class="text-primary-500 mr-1 text-2xl font-bold md:hidden">B</span>
		<span class="text-secondary-500 hidden text-2xl font-bold md:block">Manager</span>
		<span class="text-secondary-500 text-2xl font-bold md:hidden">M</span>
	</a>

	<div
		class="input focus-within:!border-primary-500 relative mx-auto flex w-[70%] max-w-lg min-w-min flex-1 items-center gap-1 !p-0 focus-within:!ring-0"
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

	<div class="flex items-center justify-end gap-4">
		<a href="/profile" aria-current={page.url.pathname === '/profile'} title="Profile">
			<IconUserCircle class="m-auto h-8 w-8 -translate-y-0.5 text-slate-500"></IconUserCircle>
		</a>

		<button
			type="button"
			class="flex items-center justify-center rounded-full bg-slate-200 p-1 text-slate-500 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
			onclick={toggleDarkMode}
			title="Toggle Dark Mode"
		>
			<IconMoon></IconMoon>
		</button>
	</div>
</header>

<style>
	header {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr minmax(auto, 75%) 1fr;
	}

	.shadow {
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
</style>
