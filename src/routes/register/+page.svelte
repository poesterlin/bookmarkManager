<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';

	let { form } = $props();
</script>

<div class="background flex h-screen items-center justify-center bg-slate-50">
	<div class="card w-md w-full overflow-hidden rounded-lg bg-white shadow-xl">
		<div class="px-6 py-8">
			<h2 class="mb-6 text-center text-3xl font-semibold">Register</h2>

			<form method="POST" action="?/register" use:enhance class="space-y-4">
				<div>
					<label for="username" class="mb-2 block text-sm font-bold text-gray-700">
						Username
					</label>
					<input
						type="text"
						id="username"
						name="username"
						class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
						placeholder="Pick a username"
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
						class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
						placeholder="••••••••"
						required
					/>
				</div>

				<div>
					<label for="email" class="mb-2 block text-sm font-bold text-gray-700">
						Email, if you want to share it
					</label>
					<input
						type="email"
						id="email"
						name="email"
						class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
						placeholder="Optional"
					/>
				</div>

				{#if form?.message}
					<p class="text-balance text-center text-sm text-rose-500" transition:fade>
						{form.message}
					</p>
				{/if}

				<input type="hidden" name="redirect" value={page.url.search} />

				<button
					type="submit"
					class="focus:shadow-outline w-full rounded bg-slate-500 px-4 py-2 font-bold text-white hover:bg-slate-700 focus:outline-none"
				>
					Register
				</button>
			</form>

			<p class="mt-4 text-center text-gray-600">
				Already have an account?
				<a href="/login{page.url.search}" class="text-violet-500 hover:text-violet-700">
					Log in here!
				</a>
			</p>
		</div>
		<div class="bg-slate-100 py-3 text-center text-xs text-gray-500">
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
