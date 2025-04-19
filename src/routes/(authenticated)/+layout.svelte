<script lang="ts">
	import { page } from '$app/state';
	import { IconUserCircle } from '@tabler/icons-svelte';

	let { children } = $props();
</script>

<div class="app-grid">
	<nav class="bg-white shadow-lg">
		<div class="mx-auto max-w-7xl px-4">
			<div class="h-18 flex justify-between">
				<div class="flex items-center">
					<a href="/" class="text-2xl font-bold" aria-current={page.url.pathname === '/'}>Home</a>
				</div>
				<div class="ml-6 flex items-center gap-6">
					<a href="/profile" aria-current={page.url.pathname === '/profile'}>
						<IconUserCircle class="m-auto h-8 w-8 -translate-y-0.5"></IconUserCircle>
					</a>
				</div>
			</div>
		</div>
	</nav>

	<section class="overflow-y-auto">
		{@render children()}
	</section>
</div>

<style>
	nav {
		view-transition-name: header;
	}

	.app-grid {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 99.6svh;
	}

	a {
		position: relative;
		min-width: 3rem;
	}

	a[aria-current='true']::after {
		content: '';
		position: absolute;
		background: currentColor;
		bottom: -0.3rem;
		height: 0.2rem;
		left: 0;
		width: 100%;
		border-radius: 0.25rem;
		view-transition-name: active-link;
	}
</style>
