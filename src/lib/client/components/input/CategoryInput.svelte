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
	let subcategory = $state('');
	let showNewSubcategory = $state(false);
	let newSubcategoryName = $state('');

	let parentCategories = $derived(categories.filter((c) => !c.parentId));
	let childrenByParent = $derived(
		categories.reduce<Record<string, Category[]>>((acc, c) => {
			if (c.parentId) {
				(acc[c.parentId] ??= []).push(c);
			}
			return acc;
		}, {})
	);

	let selectedChildren = $derived(
		selectedCategoryId ? (childrenByParent[selectedCategoryId] ?? []) : []
	);

	let hasChildren = $derived(selectedChildren.length > 0);

	function handleCategoryChange() {
		subcategory = '';
		showNewSubcategory = false;
		newSubcategoryName = '';
	}

	function handleSubcategoryChange() {
		if (subcategory === '__new__') {
			showNewSubcategory = true;
			newSubcategoryName = '';
		} else {
			showNewSubcategory = false;
			newSubcategoryName = '';
		}
	}

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
		<div class="mt-1 flex gap-2">
			<input
				type="text"
				id="newCategory"
				name="newCategory"
				bind:value={newCategory}
				class="input w-full"
				placeholder="New category name"
			/>
			<button type="button" class="button-ghost" onclick={toggleNewCategoryInput}>
				Cancel
			</button>
		</div>
	{:else}
		<div class="mt-1 flex flex-col gap-2">
			<div class="flex">
				<select
					id="category"
					class="input w-full bg-white dark:bg-gray-800 dark:text-gray-200"
					bind:value={selectedCategoryId}
					name={subcategory && subcategory !== '__new__' ? undefined : 'category'}
					onchange={handleCategoryChange}
				>
					<option value="" selected class="bg-white dark:bg-gray-900 dark:text-gray-200/60">
						Select a category</option
					>
					{#each parentCategories as cat}
						<option value={cat.id} class="bg-white dark:bg-gray-800 dark:text-gray-200">
							{cat.name}</option
						>
					{/each}
					{#each sharedCategories as cat}
						<option
							value={cat.id}
							class="bg-white dark:bg-gray-800 dark:text-gray-200"
							disabled={!cat.allowWriteAccess}
							class:opacity-50={!cat.allowWriteAccess}
							class:cursor-not-allowed={!cat.allowWriteAccess}
						>
							👥 {cat.name}</option
						>
					{/each}
				</select>
				<button type="button" class="button-ghost ml-2" onclick={toggleNewCategoryInput}>
					New
				</button>
			</div>

			{#if hasChildren}
				<div class="flex flex-col gap-2">
					<select
						class="input w-full bg-white dark:bg-gray-800 dark:text-gray-200"
						bind:value={subcategory}
						name={subcategory && subcategory !== '__new__' ? 'category' : undefined}
						onchange={handleSubcategoryChange}
					>
						<option value="" class="bg-white dark:bg-gray-900 dark:text-gray-200/60">
							No subcategory
						</option>
						{#each selectedChildren as child}
							<option value={child.id} class="bg-white dark:bg-gray-800 dark:text-gray-200">
								{child.name}
							</option>
						{/each}
						<option value="__new__" class="bg-white dark:bg-gray-800 dark:text-gray-200">
							+ New subcategory
						</option>
					</select>
					{#if showNewSubcategory}
						<input
							type="text"
							name="newCategory"
							bind:value={newSubcategoryName}
							class="input w-full"
							placeholder="New subcategory name"
						/>
						<input type="hidden" name="parentCategoryId" value={selectedCategoryId} />
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
