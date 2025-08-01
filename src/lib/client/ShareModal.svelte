<script lang="ts">
	import { goto, preloadData } from '$app/navigation';
	import type { Category } from '$lib/server/db/schema';
	import Modal from './Modal.svelte';
	import { preventDefault } from './util';

	interface Props {
		onClose: () => void;
		categories: Category[];
	}

	let { onClose, categories }: Props = $props();

	let shareId = $state<string>();

	$effect(() => {
		if (!shareId) {
			return;
		}

		preloadData(`/share/${shareId}`);
	});
</script>

<Modal {onClose}>
	<div class="p-12">
		<h1 class="text-primary-500 text-lg">Manage Category</h1>

		<form onsubmit={preventDefault(() => goto(`/share/${shareId}`))} class="flex flex-col gap-12">
			<select
				class="input w-full bg-white mt-6 dark:bg-gray-800"
				name="category"
				id="category-select"
				required
				bind:value={shareId}
			>
				<option disabled selected value=""> Select a category </option>
				{#each categories as category}
					<option value={category.id}>{category.name}</option>
				{/each}
			</select>

			<button type="submit" class="button-ghost">Share</button>
		</form>
	</div>
</Modal>
