<script lang="ts">
	import { enhance } from '$app/forms';
	import BookmarkCard from '$lib/client/BookmarkCard.svelte';

	let { data } = $props();
</script>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900"
>
	<div class="w-full max-w-2xl rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-800">
		<h1 class="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Accept Shared Collection</h1>
		{#if data.sharingCategory}
			<p class="mb-6 text-gray-700 dark:text-gray-300">
				<b class="font-semibold">{data.sharingCategory.owner}</b> has invited to join the
				collection:
				<span class="font-semibold">{data.sharingCategory.name}</span>.
			</p>
			<div class="mask card-grid mb-6 grid gap-4 opacity-80 pointer-events-none">
				{#each data.bookmarks as bookmark (bookmark.id)}
					<div
						class="limit-to-odds glass row-span-3 grid grid-rows-subgrid rounded-xl p-4 transition-all duration-300 hover:shadow-xl"
					>
						<BookmarkCard {bookmark} disabled />
					</div>
				{/each}
			</div>
			<form method="POST" action="?/confirm&token={data.sharingCategory.token}" use:enhance class="-mt-24">
				<button
					type="submit"
					class="relative z-10 w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-900"
				>
					Accept Invite
				</button>
			</form>
		{:else}
			<p class="mb-6 text-red-500 dark:text-red-400">
				No sharing invitation found or it has expired.
			</p>
		{/if}
	</div>
</div>

<style>
	.card-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	/* on mobile, only show even ones */
	@media screen and (max-width: 32rem) {
		.card-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.limit-to-odds:nth-child(2n) {
			display: none;
		}
	}

	.mask {
		mask-image: linear-gradient(to bottom, black 25%, transparent 90%);
	}
</style>
