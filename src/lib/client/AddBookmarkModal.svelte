<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { Category } from '$lib/server/db/schema';
	import { IconLoader } from '@tabler/icons-svelte';
	import { fade } from 'svelte/transition';
	import Modal from './Modal.svelte';
	import TagInput from './TagInput.svelte';
	import { tagStore } from './tags.svelte';

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

	$effect(() => {
		tagStore.existingTags = existingTags;
	});

	let form = $state<HTMLFormElement>();
	let loading = $state(false);
	let url = $state<string>();
	let title = $state<string>();
	let description = $state<string>();
	let newCategory = $state<string>();
	let showNewCategoryInput = $state(false);
	let theme = $state<string>();
	let favicon = $state<string>();
	let faviconData = $state<string>();

	$effect(() => {
		if (shareData && shareData.url) {
			url = shareData.url;
			title = shareData.title;
			description = shareData.description;

			autofill();
		}
	});

	function handleCancel() {
		if (shareData?.url) {
			return goto('/', { replaceState: true });
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

	function handleCtrlEnterSubmit(event: KeyboardEvent) {
		if (event.ctrlKey && event.key === 'Enter' && form) {
			event.preventDefault();
			form.requestSubmit();
		}
	}
</script>

<Modal onClose={handleCancel}>
	<div class="" transition:fade={{ duration: 150 }}>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<form
			onkeyup={handleCtrlEnterSubmit}
			bind:this={form}
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

				<TagInput name="tags" placeholder="Add tags..." label="Tags" />
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
