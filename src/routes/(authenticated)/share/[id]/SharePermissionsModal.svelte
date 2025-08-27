<script lang="ts">
	import Modal from '$lib/client/components/modals/Modal.svelte';

	interface Props {
		onClose: () => void;
		editingShareId: string;
		hasWriteAccess: boolean;
	}

	let { onClose, editingShareId, hasWriteAccess }: Props = $props();
</script>

<Modal {onClose} class="p-4 !border-accent-300 !border-1">
	<h2 class="text-lg font-semibold text-accent-300">Permissions</h2>
	<p class="mb-12 w-1/2">Manage the write permissions for this shared collection.</p>

	{#if hasWriteAccess}
		<form action="?/deny-write" method="POST">
			<input type="hidden" name="id" value={editingShareId} />
			<button type="submit" class="bg-primary-600 mx-auto">Deny Write Access</button>
            <p class="mt-4 text-secondary-200">
                This will prevent the user from making changes to the collection.
            </p>
		</form>
	{:else}
		<form action="?/allow-write" method="POST">
			<input type="hidden" name="id" value={editingShareId} />
			<button type="submit" class="bg-accent-600  mx-auto">Allow Write Access</button>

            <p class="mt-4 text-secondary-600">
                This will allow the user to add bookmarks to the collection.
            </p>
		</form>
	{/if}
</Modal>

<style>
	button {
		border: none;
		color: white;
		padding: 15px 32px;
		text-align: center;
		text-decoration: none;
		display: inline-block;
		font-size: 16px;
		cursor: pointer;
		border-radius: 4px;
	}
</style>
