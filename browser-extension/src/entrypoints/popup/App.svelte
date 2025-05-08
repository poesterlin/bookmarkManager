<script lang="ts">
	import AddBookmark from './AddBookmark.svelte';
	import WaitForAuth from './WaitForAuth.svelte';
	import { type StoredValue, storedValue, tokenKey } from './state.svelte';

	let auth: StoredValue<string | undefined> | undefined;

	onMount(() => {
		storedValue<string | undefined>(tokenKey).then((value) => {
			auth = value;
		});
	});
</script>

<main>
	{#if auth?.state}
		<AddBookmark token={auth.state} />
	{:else}
		<WaitForAuth />
	{/if}
</main>
