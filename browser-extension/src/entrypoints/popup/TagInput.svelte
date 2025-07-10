<script lang="ts">
	import { stopPropagation } from 'svelte/legacy';
	import { IconX } from '@tabler/icons-svelte';

	interface Props {
		selectedTags?: string[];
		existingTags?: string[];
		name?: string;
		placeholder?: string;
		label?: string;
		onTagsChange?: (tags: string[]) => void;
	}

	let {
		selectedTags = $bindable([]),
		existingTags = [],
		name = 'tags',
		placeholder = 'Add tags...',
		label = 'Tags',
		onTagsChange
	}: Props = $props();

	let tagInput = $state<string>('');
	let activeSuggestionIndex = $state(-1);

	// Use $derived instead of $effect to avoid infinite loops
	let filteredTags = $derived.by(() => {
		if (tagInput && tagInput.trim()) {
			return existingTags.filter(
				(tag) => tag.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(tag)
			);
		}
		return [];
	});

	let showSuggestions = $derived(filteredTags.length > 0 && tagInput.trim() !== '');

	// Reset active suggestion when input changes
	$effect(() => {
		activeSuggestionIndex = -1;
	});

	// Call onTagsChange when selectedTags changes
	$effect(() => {
		onTagsChange?.(selectedTags);
	});

	function addTag(tag: string) {
		const trimmedTag = tag.trim();
		if (trimmedTag && !selectedTags.includes(trimmedTag)) {
			selectedTags = [...selectedTags, trimmedTag];
		}
		tagInput = ''; // Clear input after adding
	}

	function removeTag(tagToRemove: string) {
		selectedTags = selectedTags.filter((tag) => tag !== tagToRemove);
	}

	function handleTagInputKeydown(event: KeyboardEvent) {
		if (!tagInput || tagInput.trim() === '') {
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
				tagInput = '';
				break;
		}
	}

	function handleSuggestionClick(tag: string) {
		addTag(tag);
		document.getElementById('tag-input')?.focus();
	}

	function focusInput() {
		document.getElementById('tag-input')?.focus();
	}

	function handleInputFocus() {
		// Don't automatically show suggestions on focus, only when there's input
		if (tagInput.trim()) {
			// activeSuggestionIndex will be reset by the effect
		}
	}
</script>

<div class="tag-input-wrapper relative">
	<label for="tag-input" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
		{label}
	</label>
	<!-- svelte-ignore a11y_no_abstract_role -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		role="input"
		class="input mt-1 flex w-full flex-wrap items-center gap-1 p-1"
		onclick={focusInput}
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
			onfocus={handleInputFocus}
			class="min-w-[60px] flex-grow border-none bg-transparent p-1 text-sm focus:ring-0 focus:outline-none"
			placeholder={selectedTags.length === 0 ? placeholder : ''}
			autocomplete="off"
		/>
	</div>
	<!-- Suggestions Dropdown -->
	{#if showSuggestions && filteredTags.length > 0}
		<ul
			class="ring-opacity-5 absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-gray-300 bg-white py-1 text-base text-black shadow-lg ring-1 ring-black focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
		>
			{#each filteredTags as tag, index (tag)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<li
					class="relative cursor-pointer px-3 py-2 select-none hover:bg-gray-300 hover:dark:bg-gray-900 {activeSuggestionIndex ===
					index
						? 'bg-gray-300 dark:bg-gray-700 dark:text-gray-200'
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
	<input type="hidden" {name} value={selectedTags.join(',')} />
</div>
