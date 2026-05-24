<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Category, SharedCategory } from '$lib/server/db/schema';
	import { tagStore } from '../../stores/tags.svelte';
	import { toastStore } from '../../stores/toast.svelte';
	import Modal from './Modal.svelte';
	import BookmarkForm from '../input/BookmarkForm.svelte';
	import URLInput from '../input/URLInput.svelte';
	import BookmarkFormFields from '../input/BookmarkFormFields.svelte';
	import CategoryInput from '../input/CategoryInput.svelte';
	import TagInput from '../input/TagInput.svelte';
	import { IconLock } from '@tabler/icons-svelte';

	interface Props {
		onClose: () => void;
		categories: Category[];
		sharedCategories: SharedCategory[];
		existingTags?: string[];
		shareData?: {
			title?: string;
			description?: string;
			url?: string;
		};
		hasPin?: boolean;
	}

	let {
		onClose,
		categories,
		sharedCategories,
		existingTags = [],
		shareData,
		hasPin = false
	}: Props = $props();

	tagStore.existingTags = existingTags;

	let url = $state(shareData?.url || '');
	let title = $state(shareData?.title || '');
	let description = $state(shareData?.description || '');
	let selectedCategoryId = $state('');
	let isSecret = $state(false);

	$effect(() => {
		if (shareData?.url) {
			// autofill();
		}
	});

	function handleCancel() {
		if (shareData?.url) {
			return goto('/', { replaceState: true });
		}
		onClose();
	}

	function handleUrlChange(data: any) {
		title = title || data.title;
		description = description || data.description;
	}

	function handleSubmit() {
		toastStore.show('Successfully added new Bookmark');
	}
</script>

<Modal onClose={handleCancel}>
	<BookmarkForm
		onClose={handleCancel}
		formAction="/?/add"
		submitLabel="Add Bookmark"
		header="Add New Bookmark"
		subHeader="Save a link to your collection"
		onSubmit={handleSubmit}
	>
		<URLInput bind:url onUrlChange={handleUrlChange} />
		<BookmarkFormFields bind:title bind:description />
		<CategoryInput {categories} {sharedCategories} bind:selectedCategoryId />
		<TagInput name="tags" placeholder="Add tags..." label="Tags" />
		{#if hasPin}
			<label class="flex cursor-pointer items-center gap-3 text-gray-700 dark:text-gray-300">
				<input type="hidden" name="isSecret" value={isSecret.toString()} />
				<input
					type="checkbox"
					bind:checked={isSecret}
					class="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
				/>
				<IconLock class="h-4 w-4" />
				<span class="text-sm">Secret bookmark</span>
			</label>
		{/if}
	</BookmarkForm>
</Modal>
