<script lang="ts">
	import { IconLoader, IconCheck } from '@tabler/icons-svelte';
	import { inputsKey, type StoredValue, storedValue } from './state.svelte';
	import { createApi, ApiError } from '../../lib/api';
	import { showToast } from './toast.svelte';
	import TagInput from './TagInput.svelte';

	interface Category {
		id: string;
		name: string;
		parentId: string | null;
	}

	interface Inputs {
		url: string;
		description: string;
		category: string;
		newCategory: string;
		newCategoryParent: string;
		showNewCategoryInput: boolean;
		subcategory: string;
		newSubcategoryName: string;
		selectedTags: string[];
	}

	const { token }: { token: string } = $props();

	let form = $state<HTMLFormElement>();
	let loading = $state(false);
	let submitted = $state(false);
	let error = $state('');
	let fetchingData = $state(false);

	let url = $state<string>();
	let title = $state<string>();
	let description = $state<string>();
	let newCategory = $state<string>();
	let category = $state<string>();
	let showNewCategoryInput = $state(false);
	let subcategory = $state<string>('');
	let showNewSubcategory = $state(false);
	let newSubcategoryName = $state<string>('');
	let theme = $state<string>();
	let favicon = $state<string>();
	let faviconData = $state<string>();

	// --- Tag Input State ---
	let selectedTags: string[] = $state([]);
	let existingTags: string[] = $state([]);
	let categories: Category[] = $state([]);
	let newCategoryParent = $state<string>('');

	const api = createApi(() => token);

	let parentCategories = $derived(categories.filter((c) => !c.parentId));
	let childrenByParent = $derived(
		categories.reduce<Record<string, Category[]>>((acc, c) => {
			if (c.parentId) {
				(acc[c.parentId] ??= []).push(c);
			}
			return acc;
		}, {})
	);

	let selectedChildren = $derived(category ? (childrenByParent[category] ?? []) : []);
	let hasChildren = $derived(selectedChildren.length > 0);

	// stored value for the inputs
	let inputs: StoredValue<Partial<Inputs>>;
	let inputValues = $derived({
		url,
		description,
		category,
		newCategory,
		newCategoryParent,
		showNewCategoryInput,
		subcategory,
		newSubcategoryName,
		selectedTags
	});

	$effect(() => {
		// Store the input values when they change
		const raw = $state.snapshot(inputValues);
		inputs?.set(raw);
	});

	onMount(() => {
		browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
			if (tabs.length === 0) return;
			const tab = tabs[0];

			// Grab all the tab details
			url = tab.url ?? tab.pendingUrl;
			title = tab.title;
			faviconData = tab.favIconUrl;
		});

		fetchTagsAndCategories();
	});

	async function fetchTags() {
		try {
			const data = await api.get<{ tags: { name: string }[] }>('/api/tags');
			existingTags = data.tags.map((tag: { name: string }) => tag.name);
		} catch (err: unknown) {
			if (err instanceof ApiError && !err.isAuthError) {
				showToast('Failed to load tags', 'error');
			}
		}
	}

	async function restoreInputs() {
		inputs = await storedValue<Partial<Inputs>>(inputsKey, {});
		const values = await inputs.get();
		if (values && values.url === url) {
			description = values.description;
			showNewCategoryInput = values.showNewCategoryInput ?? false;
			category = values.category;
			newCategory = values.newCategory;
			newCategoryParent = values.newCategoryParent ?? '';
			subcategory = values.subcategory ?? '';
			newSubcategoryName = values.newSubcategoryName ?? '';
			selectedTags = values.selectedTags ?? [];
		}
	}

	async function clearInputs() {
		await inputs?.set({});
	}

	async function fetchCategories() {
		try {
			const data = await api.get<{ categories: Category[] }>('/api/categories');
			categories = data.categories;
		} catch (err: unknown) {
			if (err instanceof ApiError && !err.isAuthError) {
				showToast('Failed to load categories', 'error');
			}
		}
	}

	async function fetchTagsAndCategories() {
		fetchingData = true;
		try {
			await Promise.all([fetchTags(), fetchCategories()]);
		} finally {
			fetchingData = false;
		}

		restoreInputs();
	}

	function close() {
		window.close();
	}

	function toggleNewCategoryInput() {
		showNewCategoryInput = !showNewCategoryInput;
		if (!showNewCategoryInput) {
			newCategory = '';
			newCategoryParent = '';
		}
	}

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

	async function autofill() {
		if (!url) {
			return;
		}
		loading = true;

		try {
			const data: any = await api.post('/info', { url });
			title = title || data.title;
			description = description || data.description;
			theme = data.theme;
			favicon = data.favicon;
			faviconData = data.faviconData;
		} catch (err: unknown) {
			if (err instanceof ApiError && !err.isAuthError) {
				showToast('Failed to fetch page info', 'error');
			}
		}

		loading = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
		}
		if (event.ctrlKey && event.key === 'Enter' && form) {
			event.preventDefault();
			form.requestSubmit();
		}
	}

	async function submit(event: Event) {
		if (!form) {
			return;
		}
		event.preventDefault();

		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}
		loading = true;
		error = '';
		const formData = new FormData(form);
		const data = Object.fromEntries(formData.entries());

		try {
			await api.post('/api/bookmarks', data);
			await clearInputs();
			submitted = true;
			showToast('Bookmark saved!', 'success');

			// Auto-close after 2 seconds
			setTimeout(() => {
				close();
			}, 2000);
		} catch (err: unknown) {
			if (err instanceof ApiError) {
				if (err.isValidationError) {
					const fields = (err.data?.error as Record<string, unknown>)?.fields as
						| Record<string, string>
						| undefined;
					if (fields) {
						error = Object.values(fields).join(', ');
					} else {
						error = 'Invalid input. Please check your entries.';
					}
				} else if (!err.isAuthError) {
					error = err.message;
					showToast(err.message, 'error');
				}
			} else {
				error = 'Failed to save bookmark. Please try again.';
				showToast(error, 'error');
			}
		} finally {
			loading = false;
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
{#if submitted}
	<div class="flex h-full flex-col items-center justify-center p-6">
		<div
			class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/20"
		>
			<IconCheck class="h-10 w-10 text-green-600 dark:text-green-400" />
		</div>
		<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Bookmark Saved!</h3>
		<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Closing in a moment...</p>
	</div>
{:else}
	<form
		onkeydown={handleKeydown}
		bind:this={form}
		class="flex h-full flex-col overflow-y-auto p-5 pb-0"
		method="POST"
		action="/?/add"
		onsubmit={submit}
	>
		<div class="mb-5">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Save Bookmark</h3>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Add to your collection</p>
		</div>

		<div class="flex-1 space-y-3">
			<!-- URL -->
			<div>
				<label
					for="url"
					class="block text-xs font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300"
				>
					URL
				</label>
				<div class="input mt-1.5 flex overflow-hidden !p-0">
					<input
						type="text"
						id="url"
						name="url"
						bind:value={url}
						required
						class="w-full bg-transparent py-2 pl-3 text-sm focus:outline-0"
						placeholder="https://example.com"
						onblur={autofill}
					/>

					{#if loading && !faviconData}
						<IconLoader class="mx-2 h-8 w-8 animate-spin text-gray-400"></IconLoader>
					{/if}

					{#if faviconData}
						<img src={faviconData} alt="favicon" class="h-8 w-8 flex-shrink-0 rounded p-1" />
					{/if}
				</div>
			</div>

			<!-- Title -->
			<div>
				<label
					for="title"
					class="block text-xs font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300"
				>
					Title
				</label>
				<input
					type="text"
					id="title"
					name="title"
					required
					bind:value={title}
					class="input mt-1.5 w-full text-sm"
					placeholder="My Awesome Website"
				/>
			</div>

			<!-- Description -->
			<div>
				<label
					for="description"
					class="block text-xs font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300"
				>
					Description (optional)
				</label>
				<textarea
					id="description"
					name="description"
					class="input mt-1.5 w-full text-sm"
					rows="2"
					bind:value={description}
					placeholder="Add a description..."
				></textarea>
			</div>

			<!-- Category -->
			<div>
				<label
					for="category"
					class="block text-xs font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300"
				>
					Category
				</label>
				{#if fetchingData}
					<div class="mt-1.5 flex items-center gap-2 text-sm text-gray-500">
						<IconLoader class="h-4 w-4 animate-spin" />
						Loading categories...
					</div>
				{:else if showNewCategoryInput}
					<div class="mt-1.5 flex gap-2">
						<input
							type="text"
							id="newCategory"
							name="newCategory"
							bind:value={newCategory}
							class="input flex-1 text-sm"
							placeholder="New category"
						/>
						<button
							type="button"
							class="button-ghost px-3 py-2 text-xs"
							onclick={toggleNewCategoryInput}
						>
							Cancel
						</button>
					</div>
				{:else}
					<div class="mt-1.5 flex flex-col gap-2">
						<div class="flex gap-2">
							<select
								id="category"
								class="input flex-1 bg-white text-sm dark:bg-gray-800"
								bind:value={category}
								name={subcategory && subcategory !== '__new__' ? undefined : 'category'}
								onchange={handleCategoryChange}
							>
								<option value="" selected>Select a category</option>
								{#each parentCategories as parent}
									<option value={parent.id}>{parent.name}</option>
								{/each}
							</select>
							<button
								type="button"
								class="button-ghost px-3 py-2 text-xs whitespace-nowrap"
								onclick={toggleNewCategoryInput}
							>
								New
							</button>
						</div>

						{#if category}
							<select
								class="input w-full bg-white text-sm dark:bg-gray-800"
								bind:value={subcategory}
								name={subcategory && subcategory !== '__new__' ? 'category' : undefined}
								onchange={handleSubcategoryChange}
							>
								<option value="">No subcategory</option>
								{#each selectedChildren as child}
									<option value={child.id}>{child.name}</option>
								{/each}
								<option value="__new__">+ New subcategory</option>
							</select>
							{#if showNewSubcategory}
								<input
									type="text"
									name="newCategory"
									bind:value={newSubcategoryName}
									class="input w-full text-sm"
									placeholder="New subcategory name"
								/>
								<input type="hidden" name="newCategoryParent" value={category} />
							{/if}
						{/if}
					</div>
				{/if}
			</div>

			<!-- Tags -->
			<div>
				<label
					class="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300"
				>
					Tags
				</label>
				<TagInput bind:selectedTags {existingTags} name="tags" placeholder="Add tags..." />
			</div>
		</div>

		{#if error}
			<p class="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
		{/if}

		<!-- Sticky Footer -->
		<div
			class="mt-4 flex justify-end gap-2 border-t border-gray-200 px-5 pt-4 pb-5 dark:border-gray-700"
		>
			<button type="button" class="button-ghost px-4 py-2 text-sm" onclick={close}> Cancel </button>
			<button type="submit" class="button-primary px-4 py-2 text-sm" disabled={loading}>
				{loading ? 'Saving...' : 'Add Bookmark'}
			</button>
		</div>

		{#if theme}
			<input type="hidden" name="theme" bind:value={theme} />
		{/if}
		{#if favicon}
			<input type="hidden" name="favicon" bind:value={favicon} />
		{/if}
	</form>
{/if}
