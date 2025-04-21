<script lang="ts">
	import { run, stopPropagation } from 'svelte/legacy';

	import { enhance } from '$app/forms';
	import type { Category } from '$lib/server/db/schema';
	import { fade } from 'svelte/transition';
	import { IconLoader, IconTimeDuration0 } from '@tabler/icons-svelte';

	interface Props {
		onClose: () => void;
		categories: Category[];
		existingTags?: string[];
	}

	let { onClose, categories, existingTags = [] }: Props = $props();

	let loading = $state(false);
	let url = $state('');
	let title = $state('');
	let description = $state('');
	let newCategory = $state('');
	let showNewCategoryInput = $state(false);
	let theme = $state<string>();
	let favicon = $state<string>();
	let faviconData = $state<string>();

	// --- Tag Input State ---
	let selectedTags: string[] = $state([]);
	let tagInput = $state('');
	let filteredTags: string[] = $state([]);
	let showSuggestions = $state(false);
	let activeSuggestionIndex = $state(-1);

	// Reactive statement for tag suggestions
	run(() => {
		if (tagInput.trim()) {
			filteredTags = existingTags.filter(
				(tag) => tag.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(tag)
			);
			showSuggestions = filteredTags.length > 0;
		} else {
			filteredTags = [];
			showSuggestions = false;
		}
		activeSuggestionIndex = -1; // Reset active suggestion on input change
	});

	function handleCancel() {
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

<svelte:window onclick={handleClickOutside} />

<div class="fixed inset-0 z-50 overflow-y-auto">
	<div class="fixed inset-0 bg-slate-300/20 backdrop-blur-md transition-opacity"></div>

	<div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
		<div
			class="glass relative transform overflow-hidden rounded-xl text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
			transition:fade={{ duration: 150 }}
		>
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
						<label for="url" class="block text-sm font-medium text-gray-700">URL</label>
						<div class="input mt-1 flex !p-0 overflow-hidden">
							<input
								type="text"
								id="url"
								name="url"
								bind:value={url}
								required
								class="w-full focus:outline-0 py-2 pl-2"
								placeholder="https://example.com"
								onblur={autofill}
							/>

							{#if loading && !faviconData}
								<IconLoader class="animate-spin mx-2 h-10"></IconLoader>
							{/if}

							{#if faviconData}
								<img src={faviconData} alt="favicon" class="p-2 h-10 rounded-sm" />
							{/if}
						</div>
					</div>

					<div>
						<label for="title" class="block text-sm font-medium text-gray-700">Title</label>
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
						<label for="description" class="block text-sm font-medium text-gray-700"
							>Description (optional)</label
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
						<label for="category" class="block text-sm font-medium text-gray-700">Category</label>
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
								<select id="category" class="input w-full" name="category">
									<option value="">Select a category</option>
									{#each categories as cat}
										<option value={cat.id}>{cat.name}</option>
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
						<label for="tag-input" class="block text-sm font-medium text-gray-700">Tags</label>
						<!-- svelte-ignore a11y_no_abstract_role -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div
							role="input"
							class="input mt-1 flex w-full flex-wrap items-center gap-1 p-1"
							onclick={() => document.getElementById('tag-input')?.focus()}
						>
							{#each selectedTags as tag (tag)}
								<span
									class="flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
								>
									{tag}
									<button
										type="button"
										class="ml-1 flex-shrink-0 rounded-full p-0.5 text-blue-600 hover:bg-blue-200 hover:text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
										onclick={stopPropagation(() => removeTag(tag))}
										aria-label={`Remove ${tag} tag`}
									>
										<!-- Heroicon: x-mark -->
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 16 16"
											fill="currentColor"
											class="h-3 w-3"
										>
											<path
												d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"
											/>
										</svg>
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
								class="ring-opacity-5 absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-gray-300 bg-white py-1 text-base shadow-lg ring-1 ring-black focus:outline-none sm:text-sm"
							>
								{#each filteredTags as tag, index (tag)}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
									<li
										class="relative cursor-pointer px-3 py-2 select-none hover:bg-gray-100 {activeSuggestionIndex ===
										index
											? 'bg-gray-100'
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
	</div>
</div>
