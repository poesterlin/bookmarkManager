<script lang="ts">
	import Header from '../intro/Header.svelte';
	import Footer from '../intro/Footer.svelte';
</script>

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
	<Header />

	<main class="container mx-auto px-4 py-32">
		<div class="mx-auto max-w-3xl">
			<h1 class="mb-8 text-4xl font-bold">Privacy & Data Protection</h1>

			<section class="mb-12">
				<h2 class="mb-4 text-2xl font-semibold">Data Collection & Analytics</h2>
				<p class="mb-4 text-gray-300">
					We collect minimal analytics data to improve our service using Plausible Analytics, a
					privacy-friendly alternative to Google Analytics. This includes:
				</p>
				<ul class="mb-4 list-inside list-disc space-y-2 text-gray-300">
					<li>Page views</li>
					<li>Referrer source</li>
					<li>Device type (mobile/desktop)</li>
					<li>Country of origin</li>
				</ul>
				<p class="text-gray-300">
					We do not use cookies for tracking and do not collect any personally identifiable
					information through analytics.
				</p>
			</section>

			<section class="mb-12">
				<h2 class="mb-4 text-2xl font-semibold">Authentication & Session Data</h2>
				<p class="mb-4 text-gray-300">To provide you with a personalized experience, we store:</p>
				<ul class="mb-4 list-inside list-disc space-y-2 text-gray-300">
					<li>Encrypted password hash</li>
					<li>Session tokens (deleted upon logout)</li>
					<li>Email address (for password recovery only)</li>
				</ul>
				<p class="text-gray-300">
					All authentication data is encrypted and stored securely using industry-standard
					practices.
				</p>
			</section>

			<section class="mb-12">
				<h2 class="mb-4 text-2xl font-semibold">Your Data Rights</h2>
				<p class="mb-4 text-gray-300">You have full control over your data. You can:</p>
				<ul class="mb-4 list-inside list-disc space-y-2 text-gray-300">
					<li>Request a copy of your data</li>
					<li>Update your information</li>
					<li>Delete your account and all associated data</li>
				</ul>
			</section>

			<section class="mb-12">
				<h2 class="mb-4 text-2xl font-semibold">Open Source License</h2>
				<div class="rounded-lg bg-gray-800 p-6">
					<h3 class="mb-4 text-lg font-semibold">MIT License</h3>
					<p class="text-sm leading-relaxed text-gray-300">
						Permission is hereby granted, free of charge, to any person obtaining a copy of this
						software and associated documentation files (the "Software"), to deal in the Software
						without restriction, including without limitation the rights to use, copy, modify,
						merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
						permit persons to whom the Software is furnished to do so, subject to the following
						conditions:
					</p>
					<p class="mt-4 text-sm leading-relaxed text-gray-300">
						The above copyright notice and this permission notice shall be included in all copies or
						substantial portions of the Software.
					</p>
					<p class="mt-4 text-sm leading-relaxed text-gray-300">
						THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
						INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
						PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
						LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
						OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
						OTHER DEALINGS IN THE SOFTWARE.
					</p>
				</div>
			</section>
		</div>
	</main>

	<Footer />
</div>
