<script lang="ts">
	import AddBookmark from './AddBookmark.svelte';
	import WaitForAuth from './WaitForAuth.svelte';
	import BookmarkList from './BookmarkList.svelte';
	import Toast from './Toast.svelte';
	import { type StoredValue, storedValue, tokenKey } from './state.svelte';
	import { IconPlus, IconList } from '@tabler/icons-svelte';

	let auth: StoredValue<string | undefined>;
	let view: 'add' | 'list' = 'add';

	onMount(() => {
		storedValue<string | undefined>(tokenKey).then((value) => {
			auth = value;
		});
	});
</script>

<main>
	{#if auth?.state}
		<div class="flex h-screen flex-col bg-gray-50 dark:bg-gray-950">
			<!-- Tabs Navigation -->
			<div
				class="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
			>
				<div class="flex">
					<button
						onclick={() => (view = 'add')}
						class="group relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all duration-200 {view ===
						'add'
							? 'text-primary-600 dark:text-primary-400'
							: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
					>
						<IconPlus size={18} />
						<span>Add</span>
						{#if view === 'add'}
							<div
								class="from-primary-500 to-primary-600 dark:from-primary-400 dark:to-primary-500 absolute right-0 bottom-0 left-0 h-0.5 bg-gradient-to-r"
							></div>
						{/if}
					</button>
					<div class="w-px bg-gray-200 dark:bg-gray-700"></div>
					<button
						onclick={() => (view = 'list')}
						class="group relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all duration-200 {view ===
						'list'
							? 'text-primary-600 dark:text-primary-400'
							: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
					>
						<IconList size={18} />
						<span>List</span>
						{#if view === 'list'}
							<div
								class="from-primary-500 to-primary-600 dark:from-primary-400 dark:to-primary-500 absolute right-0 bottom-0 left-0 h-0.5 bg-gradient-to-r"
							></div>
						{/if}
					</button>
				</div>
			</div>

			<!-- Content Area -->
			<div class="flex-1 overflow-hidden">
				{#if view === 'add'}
					<div class="h-full overflow-hidden">
						<AddBookmark token={auth.state} />
					</div>
				{:else}
					<div class="h-full overflow-hidden">
						<BookmarkList token={auth.state} />
					</div>
				{/if}
			</div>

			<!-- Toast Container -->
			<div class="fixed right-3 bottom-3 z-50 flex max-w-[300px] flex-col gap-2">
				<Toast />
			</div>
		</div>
	{:else}
		<WaitForAuth />
	{/if}
</main>
