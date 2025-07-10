<script lang="ts">
	import FeatureCard from './FeatureCard.svelte';

	const features = [
		{
			icon: 'bookmark',
			title: 'Save & Edit Bookmarks',
			description: 'Easily add and edit your favorite websites with just a few clicks.'
		},
		{
			icon: 'folder',
			title: 'Organize Categories',
			description: 'Create custom categories to keep your bookmarks neatly organized.'
		},
		{
			icon: 'app',
			title: 'Browser Extension',
			description: 'Access your bookmarks directly from your browser with our extension.'
		},
		{
			icon: 'tag',
			title: 'Smart Tagging',
			description: 'Tag bookmarks for even more detailed organization and filtering.'
		},
		{
			icon: 'moon',
			title: 'Dark Mode',
			description: 'Enjoy a comfortable browsing experience day or night with dark mode.'
		},
		{
			icon: 'share',
			title: 'PWA & Share Target',
			description: 'Install as an app and share links directly from other applications.'
		}
	] as const;
</script>

<section id="features" class="bg-gray-950 py-16 md:py-24">
	<div class="container mx-auto px-4">
		<div class="mb-16 text-center">
			<h2 class="mb-4 text-3xl font-bold md:text-4xl">Powerful Features</h2>
			<p class="mx-auto max-w-2xl text-lg text-gray-300">
				BookmarkManager combines simplicity with powerful features to help you manage your online
				resources effectively.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
			{#each features as feature}
				<FeatureCard icon={feature.icon} title={feature.title}>
					{feature.description}
				</FeatureCard>
			{/each}
		</div>
	</div>
</section>
