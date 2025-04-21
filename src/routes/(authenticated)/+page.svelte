<script lang="ts">
	import AddBookmarkModal from '$lib/client/AddBookmarkModal.svelte';
	import BookmarkList from '$lib/client/BookmarkList.svelte';
	import Header from '$lib/client/Header.svelte';
	import Sidebar from '$lib/client/Sidebar.svelte';
	import { IconX } from '@tabler/icons-svelte';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();

	let isAddModalOpen = $state(false);

	const handleAddBookmark = () => {
		isAddModalOpen = true;
	};

	const handleCloseModal = () => {
		isAddModalOpen = false;
	};
</script>

<div class="flex flex-col">
	<Header />

	<div class="flex flex-1 overflow-hidden">
		<Sidebar {handleAddBookmark} categories={data.categories} />

		<main class="flex-1 overflow-auto max-h-[calc(100svh-68px)] p-4 md:p-6 lg:p-8 pb-30">
			<div class="mx-auto max-w-6xl">
				{#if data.filteredTag}
					<a
						href="/"
						class="mb-4 flex w-max items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
					>
						{data.filteredTag.name}

						<IconX class="w-3"></IconX>
					</a>
				{:else}
					<div class="mb-3 flex w-max items-center gap-2 overflow-y-auto max-w-screen -mx-4 px-4 pb-1 md:mx-0 md:px-0 md:max-w-full">
						{#each data.tags as tag}
							{#if tag.name}
								<a
									href="/?tag={tag.id}"
									class="w-max flex gap-1 rounded-full bg-accent-100 px-2 py-1.5 pr-3 text-xs font-medium text-accent-800"
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

	{#if isAddModalOpen}
		<AddBookmarkModal
			onClose={handleCloseModal}
			categories={data.categories}
			existingTags={data.tags.map((tag) => tag.name)}
		/>
	{/if}
</div>
