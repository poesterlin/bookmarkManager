<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		icon,
		title,
		children
	}: {
		icon: keyof typeof iconMap;
		title: string;
		children: Snippet;
	} = $props();

	const iconMap = {
		bookmark: `M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z`,
		folder: `M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z`,
		app: [
			'M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z',
			'M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z',
			'M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z',
			'M14 7l6 0',
      'M17 4l0 6'
		],
		tag: `M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z`,
		moon: `M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z`,
		share: `M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684>`
	};
</script>

{#snippet path(d: string)}
	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" {d} />
{/snippet}

<div
	class="hover:border-primary-500 rounded-xl border border-gray-700 bg-gray-800/50 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-102 hover:transform hover:shadow-lg"
>
	<div class="flex items-start">
		<div class="from-primary-500 to-secondary-500 mb-4 rounded-lg bg-gradient-to-br p-3 shadow-lg">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 text-white"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				{#if Array.isArray(iconMap[icon])}
					{#each iconMap[icon] as p}
						{@render path(p)}
					{/each}
				{:else}
					{@render path(iconMap[icon])}
				{/if}
			</svg>
		</div>
	</div>

	<h3 class="mb-2 text-xl font-semibold">{title}</h3>
	<p class="text-gray-300">
		{@render children()}
	</p>
</div>
