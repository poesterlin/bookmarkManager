<script lang="ts">
	import type { Bookmark, Category } from '$lib/server/db/schema';
	import { tagStore } from '../../stores/tags.svelte';
	import { toastStore } from '../../stores/toast.svelte';
	import Modal from './Modal.svelte';
	import BookmarkForm from '../input/BookmarkForm.svelte';
	import URLInput from '../input/URLInput.svelte';
	import BookmarkFormFields from '../input/BookmarkFormFields.svelte';
	import CategoryInput from '../input/CategoryInput.svelte';
	import TagInput from '../input/TagInput.svelte';

	interface Props {
		bookmark: Bookmark;
		categories: Category[];
		existingTags?: string[];
		onClose: () => void;
	}

	let { bookmark, categories, existingTags = [], onClose }: Props = $props();

	tagStore.existingTags = existingTags;
	tagStore.selected = bookmark.tags.map((t) => t.name);

	let title = $state(bookmark.title);
	let description = $state(bookmark.description || '');
	let selectedCategoryId = $state(bookmark.category?.id ?? '');

	function handleSubmit() {
		toastStore.show('Successfully edited Bookmark');
	}
</script>

<Modal {onClose}>
	<BookmarkForm
		{onClose}
		formAction="/?/update"
		submitLabel="Save Changes"
		header="Edit Bookmark"
		subHeader="Update the details for this bookmark."
		onSubmit={handleSubmit}
	>
		<input type="hidden" name="id" value={bookmark.id} />
		<URLInput url={bookmark.url} readonly />
		<BookmarkFormFields bind:title bind:description />
		<CategoryInput {categories} bind:selectedCategoryId />
		<TagInput name="tags" placeholder="Add tags..." label="Tags" />
	</BookmarkForm>
</Modal>
