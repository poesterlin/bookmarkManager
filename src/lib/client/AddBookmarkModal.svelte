<script lang="ts">
	import { run, stopPropagation } from 'svelte/legacy';

	import { enhance } from '$app/forms';
	import type { Category } from '$lib/server/db/schema';
	import { fade } from 'svelte/transition';
	import { IconLoader, IconTimeDuration0, IconX } from '@tabler/icons-svelte';
	import Modal from './Modal.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		onClose: () => void;
		categories: Category[];
		existingTags?: string[];
		shareData?: {
			title?: string;
			description?: string;
			url?: string;
		};
	}

	let { onClose, categories, existingTags = [], shareData }: Props = $props();

	let loading = $state(false);
	let url = $state<string>();
	let title = $state<string>();
	let description = $state<string>();
	let newCategory = $state<string>();
	let showNewCategoryInput = $state(false);
	let theme = $state<string>();
	let favicon = $state<string>();
	let faviconData = $state<string>();

	// --- Tag Input State ---
	let selectedTags: string[] = $state([]);
	let tagInput = $state<string>();
	let filteredTags: string[] = $state([]);
	let showSuggestions = $state(false);
	let activeSuggestionIndex = $state(-1);

	$effect(() => {
		if (shareData && shareData.url) {
			url = shareData.url;
			title = shareData.title;
			description = shareData.description;

			autofill();
		}
	});

	// Reactive statement for tag suggestions
	$effect(() => {
		if (tagInput && tagInput.trim()) {
			filteredTags = existingTags.filter(
				(tag) => tag.toLowerCase().includes(tagInput!.toLowerCase()) && !selectedTags.includes(tag)
			);
			showSuggestions = filteredTags.length > 0;
		} else {
			filteredTags = [];
			showSuggestions = false;
		}
		activeSuggestionIndex = -1; // Reset active suggestion on input change
	});

	function handleCancel() {
		if (shareData?.url) {
			return goto('/');
		}

		onClose();
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

	// --- Tag Input Functions ---
	function addTag(tag: string) {
		const trimmedTag = tag.trim();
		if (trimmedTag && !selectedTags.includes(trimmedTag)) {
			selectedTags = [...selectedTags, trimmedTag];
		}
		tagInput = ''; // Clear input after adding
		showSuggestions = false; // Hide suggestions
	}

	function removeTag(tagToRemove: string) {
		selectedTags = selectedTags.filter((tag) => tag !== tagToRemove);
	}

	function handleTagInputKeydown(event: KeyboardEvent) {
		if (!tagInput || tagInput.trim() === '') {
			showSuggestions = false; // Hide suggestions if input is empty
			return;
		}

		switch (event.key) {
			case 'Enter':
			case ' ':
			case ',': // Add tag on comma as well
				event.preventDefault(); // Prevent form submission or typing comma
				if (showSuggestions && activeSuggestionIndex > -1) {
					addTag(filteredTags[activeSuggestionIndex]);
				} else if (tagInput.trim()) {
					addTag(tagInput);
				}
				break;
			case 'Backspace':
				if (tagInput === '' && selectedTags.length > 0) {
					// Remove last tag on backspace if input is empty
					removeTag(selectedTags[selectedTags.length - 1]);
				}
				break;
			case 'ArrowDown':
				event.preventDefault(); // Prevent cursor move
				if (showSuggestions) {
					activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, filteredTags.length - 1);
				}
				break;
			case 'ArrowUp':
				event.preventDefault(); // Prevent cursor move
				if (showSuggestions) {
					activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
				}
				break;
			case 'Escape':
				showSuggestions = false;
				tagInput = '';
				break;
		}
	}

	function handleSuggestionClick(tag: string) {
		addTag(tag);
		document.getElementById('tag-input')?.focus();
	}

	// Close suggestions when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.tag-input-wrapper')) {
			showSuggestions = false;
		}
	}
</script>

<Modal onClose={handleCancel}>
	<div class="" transition:fade={{ duration: 150 }}>
		<form
			use:enhance={() => {
				return ({ update }) => {
					handleCancel();
					update();
				};
			}}
			class="p-6"
			method="POST"
			action="/?/add"
			onsubmit={onclose}
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
					<label
						for="description"
						class="block text-sm font-medium text-gray-700 dark:text-gray-200"
					>
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
								class="input w-full bg-white dark:bg-gray-800 dark:text-gray-200"
								bind:value={newCategory}
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
							</select>
							<button type="button" class="button-ghost ml-2" onclick={toggleNewCategoryInput}>
								New
							</button>
						</div>
					{/if}
				</div>

				<!-- New Tag Input UI -->
				<div class="tag-input-wrapper relative">
					<label for="tag-input" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
						Tags</label
					>
					<!-- svelte-ignore a11y_no_abstract_role -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						role="input"
						class="input mt-1 flex w-full flex-wrap items-center gap-1 p-1"
						onclick={() => document.getElementById('tag-input')?.focus()}
					>
						{#each selectedTags as tag (tag)}
							<span
								class="flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300"
							>
								{tag}
								<button
									type="button"
									class="ml-1 flex-shrink-0 rounded-full p-0.5 text-blue-600 hover:bg-blue-200 hover:text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-blue-300 dark:hover:bg-blue-800 dark:hover:text-white"
									onclick={stopPropagation(() => removeTag(tag))}
									aria-label={`Remove ${tag} tag`}
								>
									<IconX class="h-3 w-3" />
								</button>
							</span>
						{/each}
						<input
							type="text"
							id="tag-input"
							bind:value={tagInput}
							onkeydown={handleTagInputKeydown}
							onfocus={() => (showSuggestions = filteredTags.length > 0)}
							class="min-w-[60px] flex-grow border-none bg-transparent p-1 text-sm focus:ring-0 focus:outline-none"
							placeholder={selectedTags.length === 0 ? 'Add tags...' : ''}
							autocomplete="off"
						/>
					</div>
					<!-- Suggestions Dropdown -->
					{#if showSuggestions && filteredTags.length > 0}
						<ul
							class="ring-opacity-5 absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-gray-300 bg-white py-1 text-base shadow-lg ring-1 ring-black focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
						>
							{#each filteredTags as tag, index (tag)}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
								<li
									class="relative cursor-pointer px-3 py-2 select-none hover:bg-gray-100 {activeSuggestionIndex ===
									index
										? 'bg-gray-100 dark:bg-gray-700 dark:text-gray-200'
										: ''}"
									onclick={() => handleSuggestionClick(tag)}
									onmouseenter={() => (activeSuggestionIndex = index)}
								>
									{tag}
								</li>
							{/each}
						</ul>
					{/if}
					<!-- Hidden input to store the final comma-separated value -->
					<input type="hidden" name="tags" value={selectedTags.join(',')} />
				</div>
				<!-- End New Tag Input UI -->
			</div>

			<div class="mt-6 flex justify-end space-x-3">
				<button type="button" class="button-ghost" onclick={handleCancel}> Cancel </button>
				<button type="submit" class="button-primary"> Add Bookmark </button>
			</div>

			{#if theme}
				<input type="hidden" name="theme" bind:value={theme} />
			{/if}
			{#if favicon}
				<input type="hidden" name="favicon" bind:value={favicon} />
			{/if}
		</form>
	</div>
</Modal>
