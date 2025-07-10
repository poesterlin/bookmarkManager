<script lang="ts">
	import Button from './Button.svelte';
</script>

<section class="pt-32 pb-16 md:pt-40 md:pb-24">
	<div class="container mx-auto px-4">
		<div class="flex flex-col items-center md:flex-row">
			<div class="mb-12 text-center md:mb-0 md:w-1/2 md:text-left">
				<h1 class="mb-6 text-4xl leading-tight font-bold md:text-5xl lg:text-6xl">
					<span class="text-primary-500">Save</span> and
					<span class="text-secondary-400">organize</span>
					your bookmarks <span class="text-accent-400">seamlessly</span>.
				</h1>

				<p class="mx-auto mb-8 max-w-lg text-xl text-gray-300 md:mx-0">
					A simple yet powerful bookmark manager that helps you organize, search, and access your
					favorite websites in one place.
				</p>

				<div class="flex flex-col justify-center gap-4 sm:flex-row md:justify-start">
					<Button href="/login" primary>Try Now</Button>
					<Button href="#features">Learn More</Button>
				</div>
			</div>

			<div class="relative md:w-1/2">
				<div class="animate-float overflow-hidden rounded-2xl shadow-2xl">
					<img
						src="/screenshots/home_desktop.webp"
						alt="BookmarkManager Desktop View"
						class="h-auto w-full rounded-2xl"
					/>
					<div
						class="absolute -right-4 -bottom-4 h-auto w-40 overflow-hidden rounded-xl border-4 border-gray-900 shadow-xl"
					>
						<img
							src="/screenshots/home_mobile.webp"
							alt="BookmarkManager Mobile View"
							class="h-auto w-full"
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
