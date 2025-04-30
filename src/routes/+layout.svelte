<script lang="ts">
	import { onMount } from 'svelte';
	import { app } from '$lib/client/app.svelte';
	import '../app.css';

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
