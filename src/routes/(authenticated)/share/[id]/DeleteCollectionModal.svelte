<script lang="ts">
	import Modal from '$lib/client/components/modals/Modal.svelte';
	import { toastStore } from '$lib/client/stores/toast.svelte';

	interface Props {
		onClose: () => void;
		collectionName: string;
	}

	let { onClose, collectionName }: Props = $props();

	let deleteMode = $state<'collection-only' | 'with-bookmarks'>('collection-only');
	let bookmarkAction = $state<'uncategorize' | 'archive' | 'delete'>('uncategorize');
	let isSubmitting = $state(false);
	let error = $state<string>();

	async function handleDelete() {
		isSubmitting = true;
		error = undefined;

		try {
			const response = await fetch(`?/delete-collection`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: `deleteMode=${encodeURIComponent(deleteMode)}&bookmarkAction=${encodeURIComponent(bookmarkAction)}`
			});

			if (!response.ok) {
				const text = await response.text();
				if (text.includes('active shares')) {
					error = 'Cannot delete collection with active shares. Please revoke all shares first.';
				} else {
					error = 'Failed to delete collection';
				}
				isSubmitting = false;
				return;
			}

			toastStore.show('Collection deleted successfully');
			// Navigate back to categories
			window.location.href = '/dashboard';
		} catch (err) {
			console.error('Error deleting collection:', err);
			error = 'Failed to delete collection';
			isSubmitting = false;
		}
	}
</script>

<Modal {onClose} class="p-6 max-w-md">
	<h2 class="text-2xl font-bold text-red-600 dark:text-red-400">Delete Collection</h2>
	<p class="mt-4 text-gray-700 dark:text-gray-300">
		Are you sure you want to delete <strong>{collectionName}</strong>?
	</p>

	{#if error}
		<div class="mt-4 rounded-md bg-red-100 p-3 dark:bg-red-900/30">
			<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
		</div>
	{/if}

	<div class="mt-6 space-y-4">
		<div>
			<label class="flex items-center gap-3">
				<input
					type="radio"
					name="deleteMode"
					value="collection-only"
					bind:group={deleteMode}
					disabled={isSubmitting}
					class="h-4 w-4 cursor-pointer"
				/>
				<span class="cursor-pointer font-medium text-gray-800 dark:text-gray-200">
					Delete collection only (keep bookmarks)
				</span>
			</label>

			{#if deleteMode === 'collection-only'}
				<div class="mt-3 ml-7 space-y-3 border-l-2 border-gray-300 pl-4 dark:border-gray-600">
					<label class="flex items-center gap-3">
						<input
							type="radio"
							name="bookmarkAction"
							value="uncategorize"
							bind:group={bookmarkAction}
							disabled={isSubmitting}
							class="h-4 w-4 cursor-pointer"
						/>
						<span class="cursor-pointer text-gray-700 dark:text-gray-300">
							Move bookmarks to Uncategorized
						</span>
					</label>

					<label class="flex items-center gap-3">
						<input
							type="radio"
							name="bookmarkAction"
							value="archive"
							bind:group={bookmarkAction}
							disabled={isSubmitting}
							class="h-4 w-4 cursor-pointer"
						/>
						<span class="cursor-pointer text-gray-700 dark:text-gray-300">Archive bookmarks</span>
					</label>

					<label class="flex items-center gap-3">
						<input
							type="radio"
							name="bookmarkAction"
							value="delete"
							bind:group={bookmarkAction}
							disabled={isSubmitting}
							class="h-4 w-4 cursor-pointer"
						/>
						<span class="cursor-pointer text-red-600 dark:text-red-400">Delete bookmarks</span>
					</label>
				</div>
			{/if}
		</div>

		<div>
			<label class="flex items-center gap-3">
				<input
					type="radio"
					name="deleteMode"
					value="with-bookmarks"
					bind:group={deleteMode}
					disabled={isSubmitting}
					class="h-4 w-4 cursor-pointer"
				/>
				<span class="cursor-pointer font-medium text-red-600 dark:text-red-400">
					Delete collection and all bookmarks
				</span>
			</label>
		</div>
	</div>

	<div class="mt-8 flex justify-end gap-3">
		<button
			onclick={onClose}
			disabled={isSubmitting}
			class="rounded bg-gray-400 px-4 py-2 font-semibold text-white hover:bg-gray-500 disabled:opacity-50"
		>
			Cancel
		</button>
		<button
			onclick={handleDelete}
			disabled={isSubmitting}
			class="flex items-center gap-2 rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
		>
			{isSubmitting ? 'Deleting...' : 'Delete Collection'}
		</button>
	</div>
</Modal>

<style>
	input[type='radio'] {
		cursor: pointer;
	}
</style>
