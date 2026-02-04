<script lang="ts">
	import ConfirmSubmit from '$lib/client/components/input/ConfirmSubmit.svelte';
	import { toastStore } from '$lib/client/stores/toast.svelte';
	import { IconCopy, IconEdit, IconFolder, IconShare, IconTrash } from '@tabler/icons-svelte';
	import SharePermissionsModal from './SharePermissionsModal.svelte';
	import DeleteCollectionModal from './DeleteCollectionModal.svelte';
	import { browser } from '$app/environment';

	let { data } = $props();

	let editingData = $state<{ id: string; hasWriteAccess: boolean }>();
	let archiveOnDelete = $state(false);
	let editingName = $state(false);
	let nameInput = $state(data.catergory.name);
	let isSubmittingName = $state(false);
	let nameError = $state<string>();
	let showDeleteModal = $state(false);

	async function shareLink(share: (typeof data.shared)[number]) {
		const url = new URL('/share', window.location.origin);
		url.searchParams.set('token', share.token!);

		if ('canShare' in navigator && navigator.canShare()) {
			try {
				await navigator.share({
					url: url.toString(),
					title: `Join my Bookmark Collection - ${data.catergory.name}`
				});
				return;
			} catch (e) {
				console.error('Failed to share link:', e);
			}
		}

		try {
			await navigator.clipboard.writeText(url.toString());
			toastStore.show('Link copied to clipboard');
			console.log('copied');
			return;
		} catch (error) {
			console.error('Failed to copy link to clipboard:', error);
		}

		toastStore.show('Failed to share');
	}

	const intl = new Intl.DateTimeFormat('de', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
	function formatDate(date: Date) {
		return intl.format(date);
	}

	async function saveName() {
		if (!nameInput.trim()) {
			nameError = 'Collection name is required';
			return;
		}

		isSubmittingName = true;
		nameError = undefined;

		try {
			const response = await fetch(`?/update-name`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: `name=${encodeURIComponent(nameInput)}`
			});

			if (!response.ok) {
				const text = await response.text();
				if (text.includes('already exists')) {
					nameError = 'A collection with this name already exists';
				} else {
					nameError = 'Failed to update collection name';
				}
				return;
			}

			editingName = false;
			toastStore.show('Collection renamed successfully');
			// Refresh page data
			window.location.reload();
		} catch (err) {
			console.error('Error saving name:', err);
			nameError = 'Failed to update collection name';
		} finally {
			isSubmittingName = false;
		}
	}

	function cancelEdit() {
		editingName = false;
		nameInput = data.catergory.name;
		nameError = undefined;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveName();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	}

	function openDeleteModal() {
		if (data.shares.length > 0) {
			toastStore.show('Cannot delete collection with active shares. Please revoke all shares first.');
			return;
		}
		showDeleteModal = true;
	}
</script>

<div class="container mx-auto h-screen px-4 py-8">
	<p class="text-gray-700 dark:text-gray-300">Sharing Collection:</p>

	{#if editingName}
		<div class="mb-12 space-y-4">
			<div class="flex items-start gap-4">
				<IconFolder class="text-primary-600 mt-2 h-10 w-10 flex-shrink-0" />
				<div class="flex-1">
					<input
						type="text"
						bind:value={nameInput}
						onkeydown={handleKeydown}
						autofocus
						class="w-full rounded-lg border-2 border-primary-500 px-4 py-3 text-3xl font-bold text-gray-800 dark:bg-gray-700 dark:text-gray-200"
					/>
					{#if nameError}
						<p class="mt-3 text-red-500 text-sm font-medium">{nameError}</p>
					{/if}
					<div class="mt-4 flex gap-3">
						<button
							onclick={saveName}
							disabled={isSubmittingName}
							class="rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
						>
							{isSubmittingName ? 'Saving...' : 'Save'}
						</button>
						<button
							onclick={cancelEdit}
							disabled={isSubmittingName}
							class="rounded-lg bg-gray-400 px-6 py-2 text-sm font-semibold text-white hover:bg-gray-500 disabled:opacity-50 transition-colors"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<h1 class="mb-12 flex items-center gap-4 text-4xl font-bold text-gray-800 dark:text-gray-200">
			<IconFolder class="text-primary-600 h-10 w-10" />
			<span>{data.catergory.name}</span>
			<button
				onclick={() => (editingName = true)}
				title="Edit collection name"
				class="ml-2 rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
			>
				<IconEdit class="h-6 w-6 text-gray-600 dark:text-gray-400" />
			</button>
		</h1>
	{/if}

	<div class="mb-12 flex flex-col gap-3 sm:flex-row">
		<form action="?/create" method="POST">
			<button
				type="submit"
				class="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 rounded-lg px-8 py-3 text-lg font-semibold text-white shadow-md transition-all duration-300 focus:ring-2 focus:ring-offset-2 focus:outline-none"
			>
				Create Share Link
			</button>
		</form>

		<button
			onclick={openDeleteModal}
			class="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border-2 border-red-400 px-8 py-3 font-semibold text-red-400 shadow-md transition-all duration-300 hover:bg-red-400 hover:text-white focus:ring-2 focus:outline-none"
		>
			Delete Collection
			<IconTrash class="h-5 w-5" />
		</button>
	</div>

	{#if data.shared.length > 0}
		<div class="space-y-4">
			{#each data.shared as share}
				<div
					class="flex items-center justify-between rounded-lg bg-white p-4 shadow-md dark:bg-gray-800"
				>
					{#if share.username}
						<p class="text-lg font-medium text-gray-900 dark:text-gray-100">{share.username}</p>
					{:else}
						<button
							onclick={() => shareLink(share)}
							class="flex items-center space-x-2 rounded-md bg-blue-500 px-4 py-2 font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
						>
							{#if browser && 'canShare' in navigator && navigator.canShare()}
								<span>Share</span>
								<IconShare class="h-5 w-5"></IconShare>
							{:else}
								<span>Copy Link</span>
								<IconCopy class="h-5 w-5"></IconCopy>
							{/if}
						</button>
					{/if}

					<button
						title="Edit Permissions"
						onclick={() => (editingData = { id: share.id, hasWriteAccess: !!share.allowWrites })}
					>
						<IconEdit></IconEdit>
					</button>

					<span>{formatDate(share.createdAt)}</span>

					<form action="?/revoke" method="POST">
						<input type="hidden" name="id" value={share.id} />

						{#snippet formSlot()}
							<div class="mt-6 flex items-center justify-between gap-4">
								<label for="archive">Archive all bookmarks added by this user</label>
								<input
									type="checkbox"
									name="archive"
									id="archive"
									class="mr-4"
									bind:checked={archiveOnDelete}
								/>
							</div>
						{/snippet}

						<input type="hidden" name="archive" class="mr-4" value={archiveOnDelete} />

						<ConfirmSubmit
							{formSlot}
							class="flex gap-2 rounded-md border-1 border-red-400 px-4 py-2 font-semibold text-red-400 shadow-md transition-all duration-300 hover:bg-red-400 hover:text-white focus:ring-2 focus:outline-none"
						>
							{share.username ? 'Revoke Access' : 'Delete'}
							<IconTrash></IconTrash>
						</ConfirmSubmit>
					</form>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-center text-lg text-gray-600 dark:text-gray-400">
			No one has access to this category.
		</p>
	{/if}
</div>

{#if editingData}
	{@const editingShareId = editingData.id}
	{@const hasWriteAccess = editingData.hasWriteAccess}

	<SharePermissionsModal
		{hasWriteAccess}
		{editingShareId}
		onClose={() => (editingData = undefined)}
	/>
{/if}

{#if showDeleteModal}
	<DeleteCollectionModal
		collectionName={data.catergory.name}
		onClose={() => (showDeleteModal = false)}
	/>
{/if}

<style>
	input[type='checkbox'] {
		width: 1.5rem;
		height: 1.5rem;
	}
</style>
