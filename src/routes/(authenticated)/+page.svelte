<script lang="ts">
	import AddBookmarkModal from '$lib/client/AddBookmarkModal.svelte';
	import BookmarkList from '$lib/client/BookmarkList.svelte';
	import Header from '$lib/client/Header.svelte';
	import Sidebar from '$lib/client/Sidebar.svelte';
	import { IconX } from '@tabler/icons-svelte';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();

	let isAddModalOpen = $state(false);
	let isMenuOpen = $state(false);

	const handleAddBookmark = () => {
		isAddModalOpen = true;
	};

	const handleCloseModal = () => {
		isAddModalOpen = false;
	};
</script>

<div class="flex min-h-screen flex-col">
	<Header />

	<div class="flex flex-1 overflow-hidden">
		<Sidebar {isMenuOpen} {handleAddBookmark} categories={data.categories} />

		<main class="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
			{#if data.filteredTag}
				<a
					href="/"
					class="flex mb-4 w-max items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 gap-1"
				>
					{data.filteredTag.name}

					<IconX class="w-3"></IconX>
				</a>
			{/if}

			<div class="mx-auto max-w-5xl">
				<BookmarkList bookmarks={data.bookmarks} />
			</div>
		</main>
	</div>

	{#if isAddModalOpen}
		<AddBookmarkModal
			onClose={handleCloseModal}
			categories={data.categories}
			existingTags={data.tags}
		/>
	{/if}

	<!-- {#if $notification}
		<NotificationToast />
	{/if} -->
</div>

<style>
	/* Additional styles can go here, but we're mainly using Tailwind utilities */
</style>
