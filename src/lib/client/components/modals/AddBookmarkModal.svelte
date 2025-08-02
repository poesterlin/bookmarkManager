<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Category } from '$lib/server/db/schema';
	import { tagStore } from '../../stores/tags.svelte';
	import { toastStore } from '../../stores/toast.svelte';
	import Modal from './Modal.svelte';
	import BookmarkForm from '../input/BookmarkForm.svelte';
	import URLInput from '../input/URLInput.svelte';
	import BookmarkFormFields from '../input/BookmarkFormFields.svelte';
	import CategoryInput from '../input/CategoryInput.svelte';
	import TagInput from '../input/TagInput.svelte';

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

	tagStore.existingTags = existingTags;

	let url = $state(shareData?.url || '');
	let title = $state(shareData?.title || '');
	let description = $state(shareData?.description || '');
	let selectedCategoryId = $state('');

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
		<CategoryInput {categories} bind:selectedCategoryId />
		<TagInput name="tags" placeholder="Add tags..." label="Tags" />
	</BookmarkForm>
</Modal>
