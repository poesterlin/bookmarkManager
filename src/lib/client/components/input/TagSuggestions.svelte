<script lang="ts">
	import { slide } from 'svelte/transition';
	import { tagStore } from '../../stores/tags.svelte';

	function handleSuggestionClick(tag: string) {
		tagStore.addTag(tag);
		document.getElementById('tag-input')?.focus();
	}
</script>

<!-- Suggestions Dropdown -->
{#if tagStore.showSuggestions && tagStore.filteredTags.length > 0}
	<ul
		transition:slide={{ duration: 150 }}
		class="ring-opacity-5 z-10 mt-1 max-h-24 w-full overflow-auto rounded-md border border-gray-300 bg-white py-1 text-base text-black shadow-lg ring-1 ring-black focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
	>
		{#each tagStore.filteredTags as tag, index (tag)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<li
				class="relative cursor-pointer px-3 py-2 select-none hover:bg-gray-300 hover:dark:bg-gray-900 {tagStore.activeSuggestionIndex ===
				index
					? 'bg-gray-300 dark:bg-gray-700 dark:text-gray-200'
					: ''}"
				onclick={() => handleSuggestionClick(tag)}
				onmouseenter={() => (tagStore.activeSuggestionIndex = index)}
			>
				{tag}
			</li>
		{/each}
	</ul>
{/if}

<style>
	ul {
		position: fixed;
		position-anchor: --tag-input-anchor;
		top: anchor(bottom);
		left: anchor(left);
		width: anchor-size(width);
		z-index: 1000;
	}
</style>
