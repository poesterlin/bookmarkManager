<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<main class="overflow-y-auto">
	{@render children()}
</main>
