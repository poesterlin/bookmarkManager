<script lang="ts">
	import AddBookmark from './AddBookmark.svelte';
	import WaitForAuth from './WaitForAuth.svelte';
	import { type StoredValue, storedValue, tokenKey } from './state.svelte';

	let auth: StoredValue<string | undefined>;
	let logs: string[] = [];

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
		<AddBookmark token={auth.state} />
	{:else}
		<WaitForAuth />
	{/if}
</main>
