<script lang="ts">
	import type { Category, SharedCategory } from '$lib/server/db/schema';

	interface Props {
		categories: Category[];
		sharedCategories: SharedCategory[];
		selectedCategoryId: string;
	}

	let { categories, sharedCategories, selectedCategoryId = $bindable() }: Props = $props();

	let newCategory = $state('');
	let showNewCategoryInput = $state(false);

	function toggleNewCategoryInput() {
		showNewCategoryInput = !showNewCategoryInput;
		if (!showNewCategoryInput) {
			newCategory = '';
		}
	}
</script>

<div>
	<label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
		>Category</label
	>
	{#if showNewCategoryInput}
		<div class="mt-1 flex">
			<input
				type="text"
				id="newCategory"
				name="newCategory"
				bind:value={newCategory}
				class="input w-full"
				placeholder="New category name"
			/>
			<button type="button" class="button-ghost ml-2" onclick={toggleNewCategoryInput}>
				Cancel
			</button>
		</div>
	{:else}
		<div class="mt-1 flex">
			<select
				id="category"
				class="input w-full bg-white dark:bg-gray-800 dark:text-gray-200"
				bind:value={selectedCategoryId}
				name="category"
			>
				<option value="" selected class="bg-white dark:bg-gray-900 dark:text-gray-200/60">
					Select a category</option
				>
				{#each categories as cat}
					<option value={cat.id} class="bg-white dark:bg-gray-800 dark:text-gray-200">
						{cat.name}</option
					>
				{/each}
				{#each sharedCategories as cat}
					<option
						value={cat.id}
						class="bg-white dark:bg-gray-800 dark:text-gray-200"
						disabled={!cat.allowWriteAccess}
					>
						👥 {cat.name}</option
					>
				{/each}
			</select>
			<button type="button" class="button-ghost ml-2" onclick={toggleNewCategoryInput}>
				New
			</button>
		</div>
	{/if}
</div>
