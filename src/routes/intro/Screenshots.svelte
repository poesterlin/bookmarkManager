<script lang="ts">
	const screenshots = [
		{
			src: '/screenshots/home_desktop.webp',
			alt: 'BookmarkManager Desktop View',
			title: 'Desktop Experience',
			description: 'Powerful organization with a clean interface on larger screens'
		},
		{
			src: '/screenshots/home_mobile.webp',
			alt: 'BookmarkManager Mobile View',
			title: 'Mobile Experience',
			description: 'Take your bookmarks anywhere with our responsive mobile design'
		}
	];
</script>

<section id="screenshots" class="py-16 md:py-24">
	<div class="container mx-auto px-4">
		<div class="mb-16 text-center">
			<h2 class="mb-4 text-3xl font-bold md:text-4xl">Experience BookmarkManager</h2>
			<p class="mx-auto max-w-2xl text-lg text-gray-300">
				A beautiful interface that works on any device, keeping your bookmarks accessible wherever
				you go.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-12 md:grid-cols-2">
			{#each screenshots as screenshot, i}
				<div
					class="group relative overflow-hidden rounded-2xl bg-gray-800 shadow-xl {i === 0
						? 'md:-rotate-1 md:transform'
						: 'md:rotate-1 md:transform'}"
				>
					<img
						src={screenshot.src}
						alt={screenshot.alt}
						class="h-auto w-full transition-opacity duration-300 group-hover:opacity-85"
					/>
					<div
						class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-gray-900 to-transparent p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					>
						<h3 class="mb-2 text-2xl font-bold">{screenshot.title}</h3>
						<p class="text-gray-300">{screenshot.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
