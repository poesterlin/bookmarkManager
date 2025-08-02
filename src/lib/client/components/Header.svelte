<script lang="ts">
	import { page } from '$app/state';
	import type { Bookmark } from '$lib/server/db/schema';
	import {
		IconLoader,
		IconMoon,
		IconSearch,
		IconSortAscending,
		IconSortDescending,
		IconUserCircle,
		IconX
	} from '@tabler/icons-svelte';
	import { fade } from 'svelte/transition';
	import { app } from '../stores/app.svelte';
	import { searchStore } from '../stores/search.svelte';
	import { iterateQueryParams } from '../util';

	let searchQuery = $state('');
	let isSearching = $state(false);
	let abortController: AbortController | null = null;

	let { isScrolled, toggleSidebar } = $props();

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
				isSearching = true;
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
			} finally {
				isSearching = false;
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
		app.setDarkMode(!darkModeEnabled);
	}
</script>

{#snippet logo()}
	<span class="text-primary-500 mr-1 hidden text-2xl font-bold md:block">Bookmark</span>
	<span class="text-primary-500 mr-1 text-2xl font-bold md:hidden">B</span>
	<span class="text-secondary-500 hidden text-2xl font-bold md:block">Manager</span>
	<span class="text-secondary-500 text-2xl font-bold md:hidden">M</span>
{/snippet}

<header class="border-secondary-200/20 z-40 border-b-2 px-4 py-3" class:shadow={isScrolled}>
	{#if page.url && page.url.pathname === '/'}
		<button
			onclick={toggleSidebar}
			aria-label="Toggle Sidebar"
			class="flex items-center justify-center"
		>
			{@render logo()}
		</button>
	{:else}
		<a class="flex items-center justify-center" href="/">
			{@render logo()}
		</a>
	{/if}

	<div
		class="input focus-within:!border-primary-500 relative mx-auto flex w-[70%] max-w-lg min-w-min flex-1 items-center gap-1 !p-0 focus-within:!ring-0"
	>
		{#if isSearching}
			<div
				in:fade={{ duration: 200 }}
				out:fade={{ duration: 200, delay: 500 }}
				class="absolute left-0"
			>
				<IconLoader
					class="ml-3 animate-spin text-gray-500"
					size={20}
					stroke-width={1.5}
					aria-label="Loading"
				/>
			</div>
		{:else}
			<div class="absolute left-0" in:fade={{ duration: 200, delay: 500 }}>
				<IconSearch class="ml-3 text-gray-500" size={20} stroke-width={1.5} />
			</div>
		{/if}
		<input
			type="text"
			placeholder="Search bookmarks..."
			class="ml-12 w-full border-none bg-transparent p-2 focus:outline-none dark:placeholder:text-gray-400"
			bind:value={searchQuery}
		/>
		{#if searchQuery}
			<button
				type="button"
				class="absolute right-2 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
				onclick={() => {
					searchQuery = '';
					searchStore.clear();
				}}
			>
				<IconX size={20} stroke-width={1.5} />
			</button>
		{:else}
			<a
				href={iterateQueryParams(page.url, 'order', [
					'date-desc',
					'date-asc',
					'clicks-desc',
					'clicks-asc'
				])}
				class="hide-label absolute right-2 flex text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
			>
				{#if page.url.searchParams.get('order') === 'date-asc'}
					<span>Date</span>
					<IconSortAscending size={20} stroke-width={1.5} />
				{:else if page.url.searchParams.get('order') === 'clicks-asc'}
					<span>Clicks</span>
					<IconSortAscending size={20} stroke-width={1.5} />
				{:else if page.url.searchParams.get('order') === 'clicks-desc'}
					<span>Clicks</span>
					<IconSortDescending size={20} stroke-width={1.5} />
				{:else}
					<!-- default -->
					<span>Date</span>
					<IconSortDescending size={20} stroke-width={1.5} />
				{/if}
			</a>
		{/if}
	</div>

	<div class="flex items-center justify-end gap-4">
		<a href="/profile" aria-current={page.url.pathname === '/profile'} class="p-1" title="Profile">
			<IconUserCircle class="h-7 w-7 text-slate-500"></IconUserCircle>
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

	.hide-label {
		span {
			width: 0;
			overflow: hidden;
			white-space: nowrap;
			transition: width 0.3s ease;
			transition-behavior: allow-discrete;
		}

		&:hover {
			gap: 0.125rem;
			span {
				width: calc-size(auto, size);
			}
		}
	}
</style>
