<script lang="ts">
	import { goto, preloadData } from '$app/navigation';
	import type { Category } from '$lib/server/db/schema';
	import Modal from './Modal.svelte';
	import { preventDefault } from '../../util';

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
				class="input mt-6 w-full bg-white dark:bg-gray-800"
				name="category"
				id="category-select"
				required
				bind:value={shareId}
			>
				<option disabled selected value="" class="bg-white dark:bg-gray-900 dark:text-gray-200/60">
					Select a category
				</option>
				{#each categories.filter(c => !c.parentId) as category}
					<option value={category.id} class="bg-white dark:bg-gray-900 dark:text-gray-200/60"
						>{category.name}</option
					>
				{/each}
			</select>

			<button type="submit" class="button-ghost">Open</button>
		</form>
	</div>
</Modal>
