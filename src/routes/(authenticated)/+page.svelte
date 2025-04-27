<script lang="ts">
	import { afterNavigate, pushState, replaceState } from '$app/navigation';
	import AddBookmarkModal from '$lib/client/AddBookmarkModal.svelte';
	import BookmarkList from '$lib/client/BookmarkList.svelte';
	import Header from '$lib/client/Header.svelte';
	import { searchStore } from '$lib/client/search.svelte';
	import Sidebar from '$lib/client/Sidebar.svelte';
	import { IconX } from '@tabler/icons-svelte';
	import type { PageServerData } from './$types';
	import { page } from '$app/state';
	import EditBookmarkModal from '$lib/client/EditBookmarkModal.svelte';

	let { data }: { data: PageServerData } = $props();
	let isScrolled = $state(false);
	let mainEl: HTMLElement;
	let shareData = $state({ title: "", text: "", url: "" });

	afterNavigate(() => {
		searchStore.clear();
	});

	const handleAddBookmark = () => {
		pushState('', {
			isAddModalOpen: true
		});
	};

	const handleCloseModal = () => {
		replaceState('', {
			isAddModalOpen: false,
			isEditModalOpen: false,
			bookmark: null
		});
	};

	function onmessage(event: MessageEvent) {
		if (event.data.type === 'web-share-target') {
			shareData = event.data.payload;
			handleAddBookmark();
		} 
	}
</script>

<svelte:window
	onscrollcapture={() => {
		isScrolled = (mainEl?.scrollTop ?? 0) > 0;
	}}
	onmessagecapture={onmessage}
/>

<div class="flex flex-col">
	<Header {isScrolled} />

	<div class="flex flex-1">
		<Sidebar {handleAddBookmark} categories={data.categories} />

		<main class="max-h-[calc(100dvh-68px)] flex-1 overflow-auto p-4 pb-30 md:p-6 lg:p-8" bind:this={mainEl}>
			<div class="mx-auto max-w-6xl">
				{#if data.filteredTag}
					<a
						href="/"
						class="mb-4 flex w-max items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300"
					>
						{data.filteredTag.name}

						<IconX class="w-3"></IconX>
					</a>
				{:else}
					<div
						class="-mx-4 mb-3 flex w-max max-w-[calc(100%+2rem)] items-center gap-2 overflow-y-auto px-4 pb-1 md:mx-0 md:max-w-full md:px-0"
					>
						{#each data.tags as tag}
							{#if tag.name}
								<a
									href="/?tag={tag.id}"
									class="bg-accent-100 text-accent-800 flex w-max gap-1 rounded-full px-2 py-1.5 pr-3 text-xs font-medium dark:bg-accent-900 dark:text-accent-300"
								>
									{tag.name}

									{#if tag.count > 1}
										<span class="font-normal text-slate-400">{tag.count}</span>
									{/if}
								</a>
							{/if}
						{/each}
					</div>
				{/if}
				<BookmarkList bookmarks={data.bookmarks} addBookmark={handleAddBookmark} />
			</div>
		</main>
	</div>

	{#if page.state.isAddModalOpen}
		<AddBookmarkModal
			onClose={handleCloseModal}
			categories={data.categories}
			existingTags={data.tags.map((tag) => tag.name)}
			{shareData}
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
</div>
