<script lang="ts">
	import { IconLoader, IconCheck } from '@tabler/icons-svelte';
	import { inputsKey, type StoredValue, storedValue } from './state.svelte';
	import TagInput from './TagInput.svelte';

	interface Category {
		id: string;
		name: string;
	}

	interface Inputs {
		url: string;
		description: string;
		category: string;
		newCategory: string;
		showNewCategoryInput: boolean;
		selectedTags: string[];
	}

	const { token }: { token: string } = $props();

	let form = $state<HTMLFormElement>();
	let loading = $state(false);
	let success = $state(false);

	let url = $state<string>();
	let title = $state<string>();
	let description = $state<string>();
	let newCategory = $state<string>();
	let category = $state<string>();
	let showNewCategoryInput = $state(false);
	let theme = $state<string>();
	let favicon = $state<string>();
	let faviconData = $state<string>();

	// --- Tag Input State ---
	let selectedTags: string[] = $state([]);
	let existingTags: string[] = $state([]);
	let categories: Category[] = $state([]);

	// stored value for the inputs
	let inputs: StoredValue<Partial<Inputs>>;
	let inputValues = $derived({
		url,
		description,
		category,
		newCategory,
		showNewCategoryInput,
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

			// TODO: get description from the page
			// TODO: get favicon link from the page

			// after the tab is loaded, see if the window accidentally closed and restore the inputs
		});

		fetchTagsAndCategories();
	});

	async function fetchTags() {
		try {
			const response = await fetch(import.meta.env.VITE_HOST + '/api/tags', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to fetch tags and categories');
			}

			const data = await response.json();
			existingTags = data.tags.map((tag: { name: string }) => tag.name);
		} catch (error) {
			console.error('Error fetching tags and categories:', error);
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
			selectedTags = values.selectedTags ?? [];
		}
	}

	async function clearInputs() {
		await inputs?.set({});
	}

	async function fetchCategories() {
		try {
			const response = await fetch(import.meta.env.VITE_HOST + '/api/categories', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to fetch categories');
			}

			const data = await response.json();
			categories = data.categories;
		} catch (error) {
			console.error('Error fetching categories:', error);
		}
	}

	async function fetchTagsAndCategories() {
		try {
			await Promise.all([fetchTags(), fetchCategories()]);
		} catch (error) {
			console.error('Error fetching tags and categories:', error);
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
		}
	}

	async function autofill() {
		if (!url) {
			return;
		}
		loading = true;

		try {
			const res = await fetch(`/info`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ url })
			});

			if (res.ok) {
				const data = await res.json();
				console.log(data);
				title = title || data.title;
				description = description || data.description;
				theme = data.theme;
				favicon = data.favicon;
				faviconData = data.faviconData;
			}
		} catch (error) {
			console.error('Error during autofill fetch:', error);
		}

		loading = false;
	}

	function handleCtrlEnterSubmit(event: KeyboardEvent) {
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
		}
		loading = true;
		const formData = new FormData(form);
		const data = Object.fromEntries(formData.entries());

		try {
			// Send the form data to the server
			const res = await fetch(import.meta.env.VITE_HOST + '/api/bookmarks', {
				method: 'POST',
				body: JSON.stringify(data),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			});

			if (!res.ok) {
				throw new Error('Failed to add bookmark');
			}

			console.log('Bookmark added successfully:', data);

			await clearInputs();
			success = true;

			// Auto-close after 2 seconds
			setTimeout(() => {
				close();
			}, 2000);
		} catch (error) {
			console.error('Error adding bookmark:', error);
		} finally {
			loading = false;
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
{#if success}
	<div class="flex h-full flex-col items-center justify-center p-6">
		<div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/20">
			<IconCheck class="h-10 w-10 text-green-600 dark:text-green-400" />
		</div>
		<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Bookmark Saved!</h3>
		<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Closing in a moment...</p>
	</div>
{:else}
	<form
		onkeyup={handleCtrlEnterSubmit}
		bind:this={form}
		class="p-5 pb-0 overflow-y-auto h-full flex flex-col"
		method="POST"
		action="/?/add"
		onsubmit={submit}
	>
		<div class="mb-5">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Save Bookmark</h3>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Add to your collection</p>
		</div>

		<div class="space-y-3 flex-1">
		<!-- URL -->
		<div>
			<label for="url" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
				URL
			</label>
			<div class="input mt-1.5 flex overflow-hidden !p-0">
				<input
					type="text"
					id="url"
					name="url"
					bind:value={url}
					required
					class="w-full py-2 pl-3 focus:outline-0 bg-transparent text-sm"
					placeholder="https://example.com"
					onblur={autofill}
				/>

				{#if loading && !faviconData}
					<IconLoader class="mx-2 h-8 w-8 animate-spin text-gray-400"></IconLoader>
				{/if}

				{#if faviconData}
					<img src={faviconData} alt="favicon" class="h-8 w-8 rounded p-1 flex-shrink-0" />
				{/if}
			</div>
		</div>

		<!-- Title -->
		<div>
			<label for="title" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
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
			<label for="description" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
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
			<label for="category" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
				Category
			</label>
			{#if showNewCategoryInput}
				<div class="mt-1.5 flex gap-2">
					<input
						type="text"
						id="newCategory"
						name="newCategory"
						bind:value={newCategory}
						class="input flex-1 text-sm"
						placeholder="New category"
					/>
					<button type="button" class="button-ghost px-3 py-2 text-xs" onclick={toggleNewCategoryInput}>
						Cancel
					</button>
				</div>
			{:else}
				<div class="mt-1.5 flex gap-2">
					<select
						id="category"
						class="input flex-1 bg-white dark:bg-gray-800 text-sm"
						bind:value={category}
						name="category"
					>
						<option value="" selected>Select a category</option>
						{#each categories as cat}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
					<button type="button" class="button-ghost px-3 py-2 text-xs whitespace-nowrap" onclick={toggleNewCategoryInput}>
						New
					</button>
				</div>
			{/if}
		</div>

		<!-- Tags -->
		<div>
			<label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
				Tags
			</label>
			<TagInput bind:selectedTags {existingTags} name="tags" placeholder="Add tags..." />
		</div>
	</div>

	<!-- Sticky Footer -->
	<div class="mt-4 px-5 pb-5 border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-end gap-2">
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
