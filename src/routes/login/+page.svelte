<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';

	let { form } = $props();
</script>

<div class="background flex h-screen items-center justify-center">
	<div class="card w-full w-md overflow-hidden rounded-lg bg-white shadow-xl">
		<div class="px-6 py-8">
			<h2 class="text-primary-500 mb-6 text-center text-3xl font-semibold">Welcome Back!</h2>

			<form method="POST" action="?/login" use:enhance class="space-y-4">
				<div>
					<label for="username" class="mb-2 block text-sm font-bold text-gray-700">
						Username
					</label>
					<input
						type="text"
						id="username"
						name="username"
						autocomplete="username"
						class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
						placeholder="Your username"
						required
					/>
				</div>

				<div>
					<label for="password" class="mb-2 block text-sm font-bold text-gray-700">
						Password
					</label>
					<input
						type="password"
						id="password"
						name="password"
						autocomplete="current-password"
						class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
						placeholder="••••••••"
						required
					/>
				</div>

				{#if form?.message}
					<p class="text-center text-sm text-balance text-fuchsia-500" transition:fade>
						{form.message}
					</p>
				{/if}

				<input type="hidden" name="redirect" value={page.url.search} />

				<button
					type="submit"
					class="button-primary focus:shadow-outline rounde0d w-full bg-black px-4 py-2 font-bold text-white hover:bg-gray-700 focus:outline-none"
				>
					Login
				</button>
			</form>

			<p class="mt-4 text-center text-gray-600">
				New around here?
				<a href="/register{page.url.search}" class="text-primary-500 hover:text-primary-700">
					Create an account!
				</a>
			</p>
		</div>
		<div class="bg-pink-100 py-3 text-center text-xs text-gray-500">
			Made with ❤️ for awesome people!
		</div>
	</div>
</div>

<style>
	h2 {
		view-transition-name: login-header;
	}

	.card {
		view-transition-name: login-card;
		max-width: 95vw;
	}

	.background {
		view-transition-name: login-background;
	}
</style>
