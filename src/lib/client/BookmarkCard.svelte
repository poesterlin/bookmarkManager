<script lang="ts">
	import { enhance } from '$app/forms';
	import { pushState } from '$app/navigation';
	import type { Bookmark } from '$lib/server/db/schema';
	import {
		IconArchive,
		IconCopy,
		IconExternalLink,
		IconPencil,
		IconRestore,
		IconStar,
		IconStarFilled,
		IconTrash
	} from '@tabler/icons-svelte';

	interface Props {
		bookmark: Bookmark;
	}

	let { bookmark }: Props = $props();

	function formatUrl(url: string): string {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname;
		} catch {
			return url;
		}
	}

	function openEditModal() {
		pushState('', {
			isEditModalOpen: true,
			bookmark: structuredClone(bookmark)
		});
	}
</script>

<!-- header -->
<div class="card-grid">
	<!-- icon -->
	<div
		class="icon mr-3 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/70 shadow-sm dark:bg-gray-800/70"
	>
		{#if bookmark.favicon}
			<img
				src="/icon/{bookmark.id}"
				alt={bookmark.title}
				class="filter-invert h-6 w-6 rounded-sm"
			/>
		{:else}
			<div
				class="bg-primary-200 text-primary-500 dark:bg-primary-700 dark:text-primary-200 flex h-6 w-6 items-center justify-center rounded-full font-bold"
				style:background={bookmark.theme}
				aria-hidden="true"
			>
				{bookmark.title.charAt(0)}
			</div>
		{/if}
	</div>

	<!-- title -->
	<h3 class="title !mb-0 line-clamp-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
		{bookmark.title}
	</h3>
	<p class="url truncate text-xs text-gray-500 dark:text-gray-400">
		{formatUrl(bookmark.url)}
	</p>

	<!-- favorite -->
	<form
		action="/?/favorite"
		use:enhance={() => {
			bookmark.isFavorite = !bookmark.isFavorite;
			return ({ update }) => {
				update();
			};
		}}
		method="POST"
		class="star"
	>
		<input type="hidden" name="id" value={bookmark.id} />
		<input type="hidden" name="favorite" value={!bookmark.isFavorite} />
		<button
			class="hover:text-primary-500 ml-1 rounded-sm text-gray-400 transition-colors duration-200 hover:bg-white/50 dark:text-gray-500 dark:hover:bg-transparent"
			aria-label={bookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
		>
			{#if bookmark.isFavorite}
				<IconStar></IconStar>
			{:else}
				<IconStarFilled></IconStarFilled>
			{/if}
		</button>
	</form>

	<!-- description -->
	{#if bookmark.description}
		<p class="description mt-5 line-clamp-4 text-sm text-gray-700 dark:text-gray-300">
			{bookmark.description}
		</p>
	{/if}
</div>
<!-- tags, category -->
<div class="flex flex-wrap gap-1">
	{#if bookmark.category?.name}
		<a
			href="/?category={bookmark.category.id}"
			class="bg-secondary-100 text-secondary-800 dark:bg-secondary-800/60 dark:text-secondary-100 rounded-full px-2 py-1 text-xs font-medium"
		>
			{bookmark.category.name}
		</a>
	{/if}
	{#each bookmark.tags as tag}
		{#if tag.name}
			<a
				class="bg-accent-100 text-accent-800 dark:bg-accent-800/60 dark:text-accent-100 rounded-full px-2 py-1 text-xs font-medium"
				href="/?tag={tag.id}"
			>
				{tag.name}
			</a>
		{/if}
	{/each}
</div>

<!-- buttons -->
<div class="flex items-center justify-between">
	<a
		href="/goto/{bookmark.id}"
		target="_blank"
		rel="noopener noreferrer"
		class="text-secondary-600 hover:text-secondary-800 dark:text-secondary-200 dark:hover:text-secondary-400 flex items-center text-sm font-medium"
	>
		Visit Site
		<IconExternalLink class="h-4"></IconExternalLink>
	</a>

	<div class="flex items-center space-x-1">
		{#if bookmark.deletedAt}
			<form action="/?/restore" use:enhance method="POST" title="Restore">
				<input type="hidden" name="id" value={bookmark.id} />
				<button
					class="rounded-full p-1.5 text-gray-500 transition-colors hover:text-green-500 hover:outline dark:hover:text-green-400"
					aria-label="Restore"
				>
					<IconRestore class="h-4 w-4"></IconRestore>
				</button>
			</form>

			<form action="/?/delete" use:enhance method="POST" title="Delete">
				<input type="hidden" name="id" value={bookmark.id} />
				<button
					class="rounded-full p-1.5 text-gray-500 transition-colors hover:text-red-500 hover:outline dark:hover:text-red-400"
					aria-label="Delete"
				>
					<IconTrash class="h-4 w-4"></IconTrash>
				</button>
			</form>
		{:else}
			<button
				onclick={() => navigator.clipboard.writeText(bookmark.url)}
				title="Copy URL"
				class="rounded-full p-1.5 text-gray-500 transition-colors hover:text-gray-800 hover:outline dark:hover:text-gray-400"
			>
				<IconCopy class="h-4 w-4"></IconCopy>
			</button>
			<button
				onclick={openEditModal}
				title="Edit"
				class="rounded-full p-1.5 text-gray-500 transition-colors hover:text-gray-800 hover:outline dark:hover:text-gray-400"
			>
				<IconPencil class="h-4 w-4"></IconPencil>
			</button>
			<form action="/?/archive" use:enhance method="POST" title="Archive">
				<input type="hidden" name="id" value={bookmark.id} />
				<button
					class="rounded-full p-1.5 text-gray-500 transition-colors hover:text-red-500 hover:outline dark:hover:text-red-400"
					aria-label="Delete"
				>
					<IconArchive class="h-4 w-4"></IconArchive>
				</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.card-grid {
		display: grid;
		grid-template-areas: 'icon title star' 'icon url url' 'description description description';
		grid-template-columns: 3rem minmax(auto, 100%) 1fr;
		grid-template-rows: auto auto 1fr;
		gap: 0 0.25rem;

		.icon {
			grid-area: icon;
		}

		.title {
			grid-area: title;
		}

		.star {
			grid-area: star;
		}

		.url {
			grid-area: url;
		}

		p.description {
			grid-area: description;
		}
	}

	:global(.dark) .filter-invert {
		filter: invert(1) hue-rotate(190deg) saturate(1.5);
	}
</style>
