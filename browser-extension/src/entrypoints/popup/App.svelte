<script lang="ts">
	import AddBookmark from './AddBookmark.svelte';
	import WaitForAuth from './WaitForAuth.svelte';
	import BookmarkList from './BookmarkList.svelte';
	import { type StoredValue, storedValue, tokenKey } from './state.svelte';
	import { IconPlus, IconList } from '@tabler/icons-svelte';

	let auth: StoredValue<string | undefined>;
	let logs: string[] = [];
	let view: 'add' | 'list' = 'add';

	onMount(() => {
		const oldlog = window.console.log;

		window.console.log = (...args) => {
			oldlog(...args);
			logs.push(JSON.stringify(args, null, 4));
			logs = logs;
		};

		storedValue<string | undefined>(tokenKey).then((value) => {
			console.log('init auth');
			auth = value;
		});
	});
</script>

<main>
	<!-- {#each logs as log}
		<pre>{log}</pre>
	{/each} -->

	{#if auth?.state}
		<div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
			<!-- Tabs Navigation -->
			<div class="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
				<div class="flex">
					<button
						onclick={() => (view = 'add')}
						class="flex-1 px-4 py-3 flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 relative group {view ===
						'add'
							? 'text-primary-600 dark:text-primary-400'
							: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}"
					>
						<IconPlus size={18} />
						<span>Add</span>
						{#if view === 'add'}
							<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-400 dark:to-primary-500"></div>
						{/if}
					</button>
					<div class="w-px bg-gray-200 dark:bg-gray-700"></div>
					<button
						onclick={() => (view = 'list')}
						class="flex-1 px-4 py-3 flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 relative group {view ===
						'list'
							? 'text-primary-600 dark:text-primary-400'
							: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}"
					>
						<IconList size={18} />
						<span>List</span>
						{#if view === 'list'}
							<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-400 dark:to-primary-500"></div>
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
		</div>
	{:else}
		<WaitForAuth />
	{/if}
</main>
