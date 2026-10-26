<script lang="ts">
	import { page } from '$app/state';
	import {
		IconCheck,
		IconChevronDown,
		IconLoader,
		IconMoon,
		IconSearch,
		IconSortAscending,
		IconSortDescending,
		IconUserCircle,
		IconX
	} from '@tabler/icons-svelte';
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { app } from '../stores/app.svelte';
	import { searchStore } from '../stores/search.svelte';
	import { addQueryParam } from '../util';

	let searchInput: HTMLInputElement;

	let { isScrolled, toggleSidebar } = $props();

	let sortOpen = $state(false);

	const sortOptions = [
		{ value: 'date-desc', label: 'Newest', dir: 'desc' as const },
		{ value: 'date-asc', label: 'Oldest', dir: 'asc' as const },
		{ value: 'clicks-desc', label: 'Most clicked', dir: 'desc' as const },
		{ value: 'clicks-asc', label: 'Least clicked', dir: 'asc' as const }
	];

	const currentSort = $derived(page.url.searchParams.get('order') ?? 'date-desc');
	const currentSortOption = $derived(
		sortOptions.find((o) => o.value === currentSort) ?? sortOptions[0]
	);

	$effect(() => {
		if (searchStore.query) sortOpen = false;
	});

	// refresh the results when the page data changes, e.g. after editing a bookmark
	let lastData = page.data;
	$effect(() => {
		if (page.data !== lastData) {
			lastData = page.data;
			untrack(() => searchStore.refresh());
		}
	});

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (sortOpen && e.key === 'Escape') {
			sortOpen = false;
			return;
		}

		const target = e.target as HTMLElement | null;
		const isTyping =
			target?.isContentEditable ||
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement;

		// "/" or Ctrl/Cmd+K focuses the search
		if ((e.key === '/' && !isTyping) || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
			e.preventDefault();
			searchInput?.focus();
			searchInput?.select();
		}
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (searchStore.query) {
				searchStore.clear();
			} else {
				searchInput.blur();
			}
		} else if (e.key === 'Enter') {
			searchStore.run(true);
		}
	}

	function toggleDarkMode() {
		const darkModeEnabled =
			localStorage.theme === 'dark' ||
			(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

		document.documentElement.classList.toggle('dark', !darkModeEnabled);
		localStorage.theme = darkModeEnabled ? 'light' : 'dark';
		app.setDarkMode(!darkModeEnabled);
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

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
		<a
			data-sveltekit-replacestate
			class="flex items-center justify-center"
			href="/"
			data-sveltekit-preload-data="hover"
		>
			{@render logo()}
		</a>
	{/if}

	<div
		class="input focus-within:!border-primary-500 relative mx-auto flex w-[70%] max-w-lg min-w-0 flex-1 items-center !p-0 focus-within:!ring-0"
	>
		{#if searchStore.loading}
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
			type="search"
			placeholder="Search bookmarks... ( / )"
			aria-label="Search bookmarks"
			autocomplete="off"
			spellcheck="false"
			class="ml-10 min-w-0 flex-1 border-none bg-transparent p-2 focus:outline-none dark:placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden"
			bind:this={searchInput}
			bind:value={searchStore.query}
			oninput={() => searchStore.run()}
			onkeydown={handleSearchKeydown}
		/>
		{#if searchStore.query}
			<button
				type="button"
				aria-label="Clear search"
				class="shrink-0 px-2 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
				onclick={() => {
					searchStore.clear();
					searchInput.focus();
				}}
			>
				<IconX size={18} stroke-width={1.5} />
			</button>
		{:else}
			<div class="relative shrink-0">
				<button
					type="button"
					class="flex items-center gap-1 border-l border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
					onclick={() => (sortOpen = !sortOpen)}
				>
					{#if currentSortOption.dir === 'asc'}
						<IconSortAscending size={18} stroke-width={1.5} class="md:hidden" />
					{:else}
						<IconSortDescending size={18} stroke-width={1.5} class="md:hidden" />
					{/if}
					<span class="hidden md:inline">{currentSortOption.label}</span>
					<IconChevronDown
						size={14}
						stroke-width={2}
						class="hidden transition-transform duration-200 md:inline {sortOpen
							? 'rotate-180'
							: ''}"
					/>
				</button>
				{#if sortOpen}
					<div class="fixed inset-0 z-40" role="none" onclick={() => (sortOpen = false)}></div>
					<div
						class="absolute right-0 z-50 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-[#1f1f2e]"
						transition:fade={{ duration: 120 }}
					>
						{#each sortOptions as option}
							<a
								data-sveltekit-replacestate
								data-sveltekit-preload-data="hover"
								href={addQueryParam(page.url, 'order', option.value)}
								class="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/5
									{currentSort === option.value
									? 'text-primary-500 font-medium'
									: 'text-gray-600 dark:text-gray-400'}"
								onclick={() => (sortOpen = false)}
							>
								{#if currentSort === option.value}
									<IconCheck size={15} stroke-width={2} />
								{:else}
									<span class="inline-block w-[15px]"></span>
								{/if}
								<span class="flex-1">{option.label}</span>
								{#if option.dir === 'asc'}
									<IconSortAscending size={16} stroke-width={1.5} class="opacity-40" />
								{:else}
									<IconSortDescending size={16} stroke-width={1.5} class="opacity-40" />
								{/if}
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="flex items-center justify-end gap-4">
		<a
			href="/profile"
			data-sveltekit-preload-data="hover"
			aria-current={page.url.pathname === '/profile'}
			class="p-1"
			title="Profile"
		>
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
</style>
