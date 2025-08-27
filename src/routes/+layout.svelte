<script lang="ts">
	import { onMount } from 'svelte';
	import { app } from '$lib/client/stores/app.svelte';
	import '../app.css';
	import { toastStore } from '$lib/client/stores/toast.svelte';

	let { children } = $props();

	onMount(() => {
		const darkModeEnabled =
			localStorage.theme === 'dark' ||
			(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

		document.documentElement.classList.toggle('dark', darkModeEnabled);
		app.setDarkMode(darkModeEnabled);
	});
</script>

{@render children()}

{#if toastStore.toasts.length > 0}
	<div class="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
		{#each toastStore.toasts as toast (toast.id)}
			<div
				class="animate-fade-in border-primary-500 rounded-md border-l-4 bg-gray-800 px-4 py-2 text-white shadow-lg"
				role="alert"
			>
				<p>{toast.message}</p>
			</div>
		{/each}
	</div>
{/if}
