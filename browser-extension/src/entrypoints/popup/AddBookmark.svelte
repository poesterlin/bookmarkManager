<script lang="ts">
	import { stopPropagation } from 'svelte/legacy';
	import { IconLoader, IconX } from '@tabler/icons-svelte';
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
			close();
		} catch (error) {
			console.error('Error adding bookmark:', error);
		} finally {
			loading = false;
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form
	onkeyup={handleCtrlEnterSubmit}
	bind:this={form}
	class="p-6"
	method="POST"
	action="/?/add"
	onsubmit={submit}
>
	<div class="mb-4">
		<h3 class="text-primary-900 text-xl font-semibold">Add New Bookmark</h3>
		<p class="text-sm text-gray-600">Save a link to your collection</p>
	</div>

	<div class="space-y-4">
		<!-- URL, Title, Description, Category inputs remain the same -->
		<div>
			<label for="url" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
				URL
			</label>
			<div class="input mt-1 flex overflow-hidden !p-0">
				<input
					type="text"
					id="url"
					name="url"
					bind:value={url}
					required
					class="w-full py-2 pl-2 focus:outline-0"
					placeholder="https://example.com"
					onblur={autofill}
				/>

				{#if loading && !faviconData}
					<IconLoader class="mx-2 h-10 animate-spin"></IconLoader>
				{/if}

				{#if faviconData}
					<img src={faviconData} alt="favicon" class="h-10 rounded-sm p-2" />
				{/if}
			</div>
		</div>

		<div>
			<label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
				Title</label
			>
			<input
				type="text"
				id="title"
				name="title"
				required
				bind:value={title}
				class="input mt-1 w-full"
				placeholder="My Awesome Website"
			/>
		</div>

		<div>
			<label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
				Description (optional)</label
			>
			<textarea
				id="description"
				name="description"
				class="input mt-1 w-full"
				rows="2"
				bind:value={description}
				placeholder="A brief description of the website"
			></textarea>
		</div>

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
						class="input w-full bg-white dark:bg-gray-800"
						bind:value={category}
						name="category"
					>
						<option
							value=""
							selected
							class="bg-white text-black dark:bg-gray-900 dark:text-gray-200/60"
						>
							Select a category</option
						>
						{#each categories as cat}
							<option
								value={cat.id}
								class="bg-white text-black dark:bg-gray-800 dark:text-gray-200"
							>
								{cat.name}</option
							>
						{/each}
					</select>
					<button type="button" class="button-ghost ml-2" onclick={toggleNewCategoryInput}>
						New
					</button>
				</div>
			{/if}
		</div>
		<TagInput bind:selectedTags {existingTags} name="tags" placeholder="Add tags..." label="Tags" />
	</div>

	<div class="mt-6 flex justify-end space-x-3">
		<button type="button" class="button-ghost" onclick={close}> Cancel </button>
		<button type="submit" class="button-primary"> Add Bookmark </button>
	</div>

	{#if theme}
		<input type="hidden" name="theme" bind:value={theme} />
	{/if}
	{#if favicon}
		<input type="hidden" name="favicon" bind:value={favicon} />
	{/if}
</form>
