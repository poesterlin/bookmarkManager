<script lang="ts">
	import BookmarkCard from '$lib/client/BookmarkCard.svelte';
	import ConfirmSubmit from '$lib/client/ConfirmSubmit.svelte';
	import { toastStore } from '$lib/client/toast.svelte.js';
	import { IconFolder, IconShare } from '@tabler/icons-svelte';

	let { data } = $props();

	async function shareLink(share: (typeof data.shared)[number]) {
		const url = new URL('/share', window.location.origin);
		url.searchParams.set('token', share.token!);

		if (navigator.canShare()) {
			try {
				await navigator.share({
					url: url.toString(),
					title: `Join my Bookmark Collection - ${data.catergory.name}`
				});
				return;
			} catch (e) {
				console.error('Failed to share link:', e);
			}
		}

		try {
			await navigator.clipboard.writeText(url.toString());
			toastStore.show('Link copied to clipboard');
			console.log('copied');
			return;
		} catch (error) {
			console.error('Failed to copy link to clipboard:', error);
		}

		toastStore.show('Failed to share');
	}

	const intl = new Intl.DateTimeFormat('de', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
	function formatDate(date: Date) {
		return intl.format(date);
	}
</script>

<div class="container mx-auto px-4 py-8 h-screen">
	<p class="text-gray-700 dark:text-gray-300">Sharing Collection:</p>
	<h1 class="mb-6 text-3xl font-bold text-gray-800 dark:text-gray-200">
		<IconFolder class="text-primary-600 inline h-8 w-8" />
		{data.catergory.name}
	</h1>

	<form action="?/create" method="POST" class="mb-8">
		<button
			type="submit"
			class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 rounded-md px-6 py-3 text-lg font-semibold text-white shadow-md transition-all duration-300 focus:ring-2 focus:ring-offset-2 focus:outline-none"
		>
			Create Share Link
		</button>
	</form>

	{#if data.shared.length > 0}
		<div class="space-y-4">
			{#each data.shared as share}
				<div
					class="flex items-center justify-between rounded-lg bg-white p-4 shadow-md dark:bg-gray-800"
				>
					{#if share.username}
						<p class="text-lg font-medium text-gray-900 dark:text-gray-100">{share.username}</p>
					{:else}
						<button
							onclick={() => shareLink(share)}
							class="flex items-center space-x-2 rounded-md bg-blue-500 px-4 py-2 font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
						>
							<span>Share Invite Link</span>
							<IconShare class="h-5 w-5"></IconShare>
						</button>
					{/if}

					<span>{formatDate(share.createdAt)}</span>

					<form action="?/revoke" method="POST">
						<input type="hidden" name="id" value={share.id} />
						<ConfirmSubmit
							class="rounded-md bg-red-600 px-4 py-2 font-semibold text-white shadow-md transition-all duration-300 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
						>
							{share.username ? 'Revoke Access' : 'Delete'}
						</ConfirmSubmit>
					</form>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-center text-lg text-gray-600 dark:text-gray-400">
			No one has access to this category.
		</p>
	{/if}
</div>
