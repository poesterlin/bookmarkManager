<script lang="ts">
	import { afterNavigate, pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import AddBookmarkModal from '$lib/client/components/modals/AddBookmarkModal.svelte';
	import { app } from '$lib/client/stores/app.svelte';
	import BookmarkList from '$lib/client/components/BookmarkList.svelte';
	import EditBookmarkModal from '$lib/client/components/modals/EditBookmarkModal.svelte';
	import Header from '$lib/client/components/Header.svelte';
	import { searchStore } from '$lib/client/stores/search.svelte';
	import Sidebar from '$lib/client/components/Sidebar.svelte';
	import { toastStore } from '$lib/client/stores/toast.svelte';
	import { toggleQueryParam } from '$lib/client/util';
	import { IconMinus } from '@tabler/icons-svelte';
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import type { PageServerData } from './$types';
	import { fly } from 'svelte/transition';
	import ShareModal from '$lib/client/components/modals/ShareModal.svelte';

	let { data }: { data: PageServerData } = $props();
	let isScrolled = $state(false);
	let mainEl: HTMLElement;
	let isMenuOpen = $state(false);
	let isShareMenuOpen = $state(false);

	const shareModalHandler = {
		open: () => (isShareMenuOpen = true),
		close: () => (isShareMenuOpen = false)
	};

	afterNavigate(() => {
		searchStore.clear();
	});

	$effect(() => {
		if (data.shareTarget.url) {
			tick().then(() => {
				handleAddBookmark();
			});
		}
	});

	function handleAddBookmark() {
		pushState('', {
			isAddModalOpen: true
		});
	}

	function handleCloseModal() {
		replaceState('', {
			isAddModalOpen: false,
			isEditModalOpen: false,
			bookmark: null
		});
	}

	function toggleSidebar() {
		isMenuOpen = !isMenuOpen;
	}
</script>

<svelte:window
	onscrollcapture={() => {
		isScrolled = (mainEl?.scrollTop ?? 0) > 0;
	}}
	ontouchstart={() => (app.isTouching = true)}
	ontouchend={() => (app.isTouching = false)}
/>

<div class="flex h-screen flex-col">
	<Header {isScrolled} {toggleSidebar} />

	<div class="flex flex-1">
		<Sidebar
			{handleAddBookmark}
			categories={data.categories}
			shared={data.sharedCategories}
			bind:isMenuOpen
			{shareModalHandler}
		/>

		<main
			class="relative max-h-[calc(100dvh-68px)] flex-1 overflow-auto p-2"
			onscroll={(e) => app.updateScroll(e)}
			bind:this={mainEl}
		>
			{#if data.tags.length}
				<div
					class="bg-accent-700/10 dark:bg-accent-100/10 sticky top-0 z-10 mx-auto w-max max-w-[min(72rem,100%)] rounded-full py-2 backdrop-blur-xs"
					style:translate="0px {app.yClamped}px"
				>
					<div class="scrollbar-none mask flex items-center gap-2 overflow-y-auto rounded-md px-2">
						{#each data.tags as tag (tag.id)}
							{@const show = tag.name && (!data.filteredTag || data.filteredTag.id === tag.id)}
							<a
								animate:flip={{ duration: 150 }}
								href={toggleQueryParam(page.url, 'tag', tag.id)}
								class:hidden={!show}
								class="bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-100 flex w-max w-max max-w-[calc(100%+2rem)] min-w-max items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium whitespace-nowrap"
							>
								{tag.name}

								{#if data.filteredTag?.id === tag.id}
									<div in:fly={{ x: 40, delay: 100 }}>
										<IconMinus class="h-3"></IconMinus>
									</div>
								{:else if tag.count > 1}
									<span class="pr-1 font-normal text-slate-400">{tag.count}</span>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			{/if}
			<div class="ignore-scroll mx-auto max-w-6xl p-2 !pt-2 pb-24 md:p-4 lg:p-6">
				<BookmarkList bookmarks={data.bookmarks} addBookmark={handleAddBookmark} />
			</div>
		</main>
	</div>

	{#if page.state.isAddModalOpen}
		<AddBookmarkModal
			onClose={handleCloseModal}
			categories={data.categories}
			existingTags={data.tags.map((tag) => tag.name)}
			shareData={data.shareTarget}
		/>
	{/if}

	{#if page.state.isEditModalOpen && page.state.bookmark}
		<EditBookmarkModal
			bookmark={page.state.bookmark}
			onClose={handleCloseModal}
			categories={data.categories}
			existingTags={data.tags.map((tag) => tag.name)}
		/>
	{/if}

	{#if isShareMenuOpen}
		<ShareModal onClose={handleCloseModal} categories={data.categories} />
	{/if}

	{#if toastStore.toasts.length > 0}
		<div class="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
			{#each toastStore.toasts as toast (toast.id)}
				<div
					class="animate-fade-in border-primary-500 rounded-md border-l-4 bg-gray-800 px-4 py-2 text-white shadow-lg"
					role="alert"
				>
					<p>{toast.message}</p>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.scrollbar-none {
		scrollbar-width: none;
	}

	.mask {
		mask: linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent);
	}
</style>
