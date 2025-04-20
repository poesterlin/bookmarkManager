<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Bookmark } from '$lib/server/db/schema';
	import { IconTrash } from '@tabler/icons-svelte';

	export let bookmark: Bookmark;

	function formatUrl(url: string): string {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname;
		} catch {
			return url;
		}
	}
</script>

<div>
	<!-- header -->
	<div class="flex">
		<!-- icon -->
		<div
			class="mr-3 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/70 shadow-sm"
		>
			{#if bookmark.favicon}
				<img src={bookmark.favicon} alt={bookmark.title} class="h-6 w-6" />
			{:else}
				<div
					class="bg-primary-200 text-primary-500 flex h-6 w-6 items-center justify-center rounded-full font-bold"
					style:background={bookmark.theme}
				>
					{bookmark.title.charAt(0)}
				</div>
			{/if}
		</div>
		<!-- title -->
		<div class="min-w-0 flex-1">
			<h3 class="line-clamp-3 text-lg font-semibold text-gray-800">
				{bookmark.title}
			</h3>
			<p class="text-xs text-gray-500">
				{formatUrl(bookmark.url)}
			</p>
		</div>
		<!-- favorite -->
		<form action="/?/favorite" use:enhance method="POST">
			<input type="hidden" name="id" value={bookmark.id} />
			<input type="hidden" name="favorite" value={!bookmark.isFavorite} />
			<button
				class="hover:text-primary-500 text-gray-400 transition-colors"
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
	</div>

	<!-- description -->
	{#if bookmark.description}
		<p class="mt-5 line-clamp-4 text-sm text-gray-700">
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
<div class="flex items-center justify-between border-t border-white/30">
	<a
		href={bookmark.url}
		target="_blank"
		rel="noopener noreferrer"
		class="text-secondary-600 hover:text-secondary-800 flex items-center text-sm font-medium"
	>
		Visit Site
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="ml-1 h-4 w-4"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
			/>
		</svg>
	</a>

	<div class="flex items-center space-x-1">
		<!-- <button
	class="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/50 hover:text-gray-700"
	aria-label="Edit"
	>
	<IconPencil class="h-4 w-4"></IconPencil>
	</button> -->
		<form action="/?/delete" use:enhance method="POST">
			<input type="hidden" name="id" value={bookmark.id} />
			<button
				class="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/50 hover:text-red-500"
				aria-label="Delete"
			>
				<IconTrash class="h-4 w-4"></IconTrash>
			</button>
		</form>
	</div>
</div>
