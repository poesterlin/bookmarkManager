<script lang="ts">
	import { run, stopPropagation } from 'svelte/legacy';
	import { enhance } from '$app/forms';
	import type { Bookmark, Category, Tag } from '$lib/server/db/schema';
	import { fade } from 'svelte/transition';
	import Modal from './Modal.svelte';
	import { toastStore } from './toast.svelte';

	interface Props {
		bookmark: Bookmark;
		categories: Category[];
		existingTags?: string[]; // All tags available in the system for suggestions
		onClose: () => void;
	}

	let { bookmark, categories, existingTags = [], onClose }: Props = $props();

	// --- Initialize state from the bookmark prop ---
	let title = $state(bookmark.title);
	let description = $state(bookmark.description || '');
	// Ensure categoryId is treated as string for select binding if it comes as number
	let selectedCategoryId = $state(bookmark.category?.id ?? '');
	let newCategory = $state('');
	let showNewCategoryInput = $state(false);

	// --- Tag Input State (Initialized) ---
	let selectedTags: string[] = $state(bookmark.tags.map((t) => t.name).filter(Boolean));
	let tagInput = $state('');
	let filteredTags: string[] = $state([]);
	let showSuggestions = $state(false);
	let activeSuggestionIndex = $state(-1);

	// Reactive statement for tag suggestions (same as Add modal)
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
			// If user cancels adding new category, revert to original selection if possible
			selectedCategoryId = bookmark.category?.id ?? '';
		} else {
			// Clear selection when switching to new category input
			selectedCategoryId = '';
		}
	}

	// --- Tag Input Functions (same as Add modal) ---
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
			case ',':
				event.preventDefault();
				if (showSuggestions && activeSuggestionIndex > -1) {
					addTag(filteredTags[activeSuggestionIndex]);
				} else if (tagInput.trim()) {
					addTag(tagInput);
				}
				break;
			case 'Backspace':
				if (tagInput === '' && selectedTags.length > 0) {
					removeTag(selectedTags[selectedTags.length - 1]);
				}
				break;
			case 'ArrowDown':
				event.preventDefault();
				if (showSuggestions) {
					activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, filteredTags.length - 1);
				}
				break;
			case 'ArrowUp':
				event.preventDefault();
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
		document.getElementById('edit-tag-input')?.focus(); // Use unique ID if needed
	}

	// Close suggestions when clicking outside (same as Add modal)
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.tag-input-wrapper')) {
			showSuggestions = false;
		}
	}

	// Add listener for clicks outside tag input
	$effect(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<Modal {onClose}>
	<div class="" transition:fade={{ duration: 150 }}>
		<form
			use:enhance={() => {
				return ({ update }) => {
					toastStore.show('Successfully edited new Bookmark');
					handleCancel();
					update();
				};
			}}
			class="p-6"
			method="POST"
			action="/?/update"
		>
			<!-- Hidden input to send the bookmark ID -->
			<input type="hidden" name="id" value={bookmark.id} />

			<div class="mb-4">
				<h3 class="text-primary-900 text-xl font-semibold">Edit Bookmark</h3>
				<p class="text-sm text-gray-600">Update the details for this bookmark.</p>
			</div>

			<div class="space-y-4">
				<!-- URL -->
				<div>
					<label for="edit-url" class="block text-sm font-medium text-gray-700">URL</label>
					<input
						type="text"
						id="edit-url"
						name="url"
						value={bookmark.url}
						readonly
						class="input mt-1 w-full bg-gray-100 focus:bg-white focus:ring-0 focus:outline-none !focus:box-shadow-none cursor-not-allowed opacity-50"
						placeholder="https://example.com"
					/>
				</div>

				<!-- Title -->
				<div>
					<label for="edit-title" class="block text-sm font-medium text-gray-700">Title</label>
					<input
						type="text"
						id="edit-title"
						name="title"
						required
						bind:value={title}
						class="input mt-1 w-full"
						placeholder="My Awesome Website"
					/>
				</div>

				<!-- Description -->
				<div>
					<label for="edit-description" class="block text-sm font-medium text-gray-700"
						>Description (optional)</label
					>
					<textarea
						id="edit-description"
						name="description"
						class="input mt-1 w-full"
						rows="2"
						bind:value={description}
						placeholder="A brief description of the website"
					></textarea>
				</div>

				<!-- Category -->
				<div>
					<label for="edit-category" class="block text-sm font-medium text-gray-700">Category</label
					>
					{#if showNewCategoryInput}
						<div class="mt-1 flex">
							<input
								type="text"
								id="edit-newCategory"
								name="newCategory"
								bind:value={newCategory}
								class="input w-full"
								placeholder="New category name"
							/>
							<button
								type="button"
								class="button-ghost ml-2 flex-shrink-0"
								onclick={toggleNewCategoryInput}
							>
								Cancel
							</button>
						</div>
					{:else}
						<div class="mt-1 flex">
							<select
								id="edit-category"
								class="input w-full"
								name="category"
								bind:value={selectedCategoryId}
								disabled={showNewCategoryInput}
							>
								<option value="">Select a category</option>
								{#each categories as cat}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
							<button
								type="button"
								class="button-ghost ml-2 flex-shrink-0"
								onclick={toggleNewCategoryInput}
							>
								New
							</button>
						</div>
					{/if}
				</div>

				<!-- Tag Input UI (Adapted from Add modal) -->
				<div class="tag-input-wrapper relative">
					<label for="edit-tag-input" class="block text-sm font-medium text-gray-700">Tags</label>
					<!-- svelte-ignore a11y_no_abstract_role -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						role="input"
						class="input mt-1 flex w-full flex-wrap items-center gap-1 p-1"
						onclick={() => document.getElementById('edit-tag-input')?.focus()}
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
							id="edit-tag-input"
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
				<!-- End Tag Input UI -->
			</div>

			<div class="mt-6 flex justify-end space-x-3">
				<button type="button" class="button-ghost" onclick={handleCancel}> Cancel </button>
				<button type="submit" class="button-primary"> Save Changes </button>
			</div>
		</form>
	</div>
</Modal>
