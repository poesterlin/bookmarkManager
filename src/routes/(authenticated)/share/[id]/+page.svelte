<script lang="ts">
	import ConfirmSubmit from '$lib/client/components/input/ConfirmSubmit.svelte';
	import { toastStore } from '$lib/client/stores/toast.svelte';
	import { IconEdit, IconFolder, IconShare, IconTrash } from '@tabler/icons-svelte';
	import SharePermissionsModal from './SharePermissionsModal.svelte';

	let { data } = $props();

	let editingData = $state<{ id: string; hasWriteAccess: boolean }>();
	let archiveOnDelete = $state(false);

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
</script>

<div class="container mx-auto h-screen px-4 py-8">
	<p class="text-gray-700 dark:text-gray-300">Sharing Collection:</p>
	<h1 class="mb-6 text-3xl font-bold text-gray-800 dark:text-gray-200">
		<IconFolder class="text-primary-600 inline h-8 w-8" />
		{data.catergory.name}
	</h1>

	<form action="?/create" method="POST" class="mb-8">
		<button
			type="submit"
			class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 rounded-md px-6 py-3 text-lg font-semibold text-white shadow-md transition-all duration-300 focus:ring-2 focus:ring-offset-2 focus:outline-none"
		>
			Create Share Link
		</button>
	</form>

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
							<span>Share</span>
							<IconShare class="h-5 w-5"></IconShare>
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
							<div class="flex items-center gap-4 justify-between mt-6">
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

<style>
	input[type='checkbox'] {
		width: 1.5rem;
		height: 1.5rem;
	}
</style>
