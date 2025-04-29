<script lang="ts">
	import Header from './Header.svelte';
	import Hero from './Hero.svelte';
	import Features from './Features.svelte';
	import Screenshots from './Screenshots.svelte';
	import CallToAction from './CallToAction.svelte';
	import Footer from './Footer.svelte';
</script>

<main>
	<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
		<Header />
		<Hero />
		<Features />
		<!-- <Screenshots /> -->
		<CallToAction />
		<Footer />
	</div>
</main>
