<script lang="ts">
	import type { Bookmark, Category, SharedCategory, Tag } from '$lib/server/db/schema';
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
		bookmark: Bookmark;
		categories: Category[];
		sharedCategories: SharedCategory[];
		existingTags?: string[];
		onClose: () => void;
		hasPin?: boolean;
		onOptimisticEdit?: (
			id: string,
			changes: {
				title: string;
				description: string;
				category?: Category;
				tags: Tag[];
				isSecret: boolean;
			}
		) => void;
	}

	let {
		bookmark,
		categories,
		sharedCategories,
		existingTags = [],
		onClose,
		hasPin = false,
		onOptimisticEdit
	}: Props = $props();

	tagStore.existingTags = existingTags;
	tagStore.selected = bookmark.tags.map((t) => t.name);

	let title = $state(bookmark.title);
	let description = $state(bookmark.description || '');
	let selectedCategoryId = $state(bookmark.fromShareId ?? bookmark.category?.id ?? '');
	let isSecret = $state(bookmark.isSecret ?? false);

	function handleSubmit() {
		toastStore.show('Successfully edited Bookmark');
	}

	function handleOptimistic() {
		if (!onOptimisticEdit) return;

		let categoryObj: Category | undefined = categories.find((c) => c.id === selectedCategoryId);
		if (!categoryObj && selectedCategoryId) {
			const shared = sharedCategories.find((c) => c.id === selectedCategoryId);
			if (shared) {
				categoryObj = { id: shared.id, name: shared.name } as Category;
			}
		}

		const tagObjects: Tag[] = tagStore.selected.map((name) => ({
			name,
			id: '',
			createdAt: new Date(),
			updatedAt: new Date(),
			userId: ''
		}));

		onOptimisticEdit(bookmark.id, {
			title,
			description,
			category: categoryObj,
			tags: tagObjects,
			isSecret
		});
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
		optimisticFn={handleOptimistic}
	>
		<input type="hidden" name="id" value={bookmark.id} />
		<URLInput url={bookmark.url} />
		<BookmarkFormFields bind:title bind:description />
		<CategoryInput {categories} bind:selectedCategoryId {sharedCategories} />
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
