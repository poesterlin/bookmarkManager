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
		class="icon mr-3 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/70 shadow-sm"
	>
		{#if bookmark.favicon}
			<img src="/icon/{bookmark.id}" alt={bookmark.title} class="h-6 w-6 rounded-sm" />
		{:else}
			<div
				class="bg-primary-200 text-primary-500 flex h-6 w-6 items-center justify-center rounded-full font-bold"
				style:background={bookmark.theme}
				aria-hidden="true"
			>
				{bookmark.title.charAt(0)}
			</div>
		{/if}
	</div>

	<!-- title -->
	<h3 class="title !mb-0 line-clamp-3 text-lg font-semibold text-gray-800">
		{bookmark.title}
	</h3>
	<p class="url truncate text-xs text-gray-500">
		{formatUrl(bookmark.url)}
	</p>

	<!-- favorite -->
	<form action="/?/favorite" use:enhance method="POST" class="star">
		<input type="hidden" name="id" value={bookmark.id} />
		<input type="hidden" name="favorite" value={!bookmark.isFavorite} />
		<button
			class="hover:text-primary-500 ml-1 text-gray-400 transition-colors"
			aria-label={bookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				fill={bookmark.isFavorite ? 'currentColor' : 'none'}
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
				/>
			</svg>
		</button>
	</form>

	<!-- description -->
	{#if bookmark.description}
		<p class="description mt-5 line-clamp-4 text-sm text-gray-700">
			{bookmark.description}
		</p>
	{/if}
</div>
<!-- tags, category -->
<div class="flex flex-wrap gap-1">
	{#if bookmark.category?.name}
		<a
			href="/?category={bookmark.category.id}"
			class="bg-secondary-100 text-secondary-800 rounded-full px-2 py-1 text-xs font-medium"
		>
			{bookmark.category.name}
		</a>
	{/if}
	{#each bookmark.tags as tag}
		{#if tag.name}
			<a
				class="bg-accent-100 text-accent-800 rounded-full px-2 py-1 text-xs font-medium"
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
		class="text-secondary-600 hover:text-secondary-800 flex items-center text-sm font-medium"
	>
		Visit Site
		<IconExternalLink class="h-4"></IconExternalLink>
	</a>

	<div class="flex items-center space-x-1">
		{#if bookmark.deletedAt}
			<form action="/?/restore" use:enhance method="POST" title="Restore">
				<input type="hidden" name="id" value={bookmark.id} />
				<button
					class="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/50 hover:text-green-500"
					aria-label="Restore"
				>
					<IconRestore class="h-4 w-4"></IconRestore>
				</button>
			</form>

			<form action="/?/delete" use:enhance method="POST" title="Delete">
				<input type="hidden" name="id" value={bookmark.id} />
				<button
					class="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/50 hover:text-red-500"
					aria-label="Delete"
				>
					<IconTrash class="h-4 w-4"></IconTrash>
				</button>
			</form>
		{:else}
			<button
				onclick={() => navigator.clipboard.writeText(bookmark.url)}
				title="Copy URL"
				class="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/50 hover:text-gray-800"
			>
				<IconCopy
					class="h-4 w-4 text-gray-500 transition-colors hover:bg-white/50 hover:text-gray-800"
				></IconCopy>
			</button>
			<button
				onclick={openEditModal}
				title="Edit"
				class="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/50 hover:text-gray-800"
			>
				<IconPencil
					class="h-4 w-4 text-gray-500 transition-colors hover:bg-white/50 hover:text-gray-800"
				></IconPencil>
			</button>
			<form action="/?/archive" use:enhance method="POST" title="Archive">
				<input type="hidden" name="id" value={bookmark.id} />
				<button
					class="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/50 hover:text-red-500"
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
</style>
