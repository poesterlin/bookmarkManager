<script lang="ts">
	import { storedValue, challengeKey, tokenKey, type StoredValue } from './state.svelte';

	let abortController: AbortController | null = null;
	let challenge: StoredValue<string | undefined>;
	let fallback: string;

	onMount(() => {
		let cleanup = () => {};

		console.log('mounted');

		storedValue<string | undefined>(challengeKey)
			.then(async (value) => {
				challenge = value;
				await startChallenge();
			})
			.then(() => {
				console.log('Starting challenge...', challenge.get());
				cleanup = tryAuthenticate();
			})
			.catch(() => {
				if (abortController) {
					abortController.abort();
				}
			});

		return () => {
			cleanup();
		};
	});

	async function startChallenge() {
		if (challenge.get()) {
			console.log('Challenge token already exists:', challenge);
			return;
		}

		const response = await fetch(import.meta.env.VITE_HOST + '/challenge', { method: 'POST' });

		if (!response.ok) {
			throw new Error('Failed to fetch challenge token');
		}

		const { token } = await response.json();
		await challenge.set(token);

		console.log('Challenge token received:', token);
		fallback = token;

		// open tab to authenticate
		await browser.tabs.create({
			url: `${import.meta.env.VITE_HOST}/challenge/${token}`,
			active: true
		});
	}

	async function getSession() {
		const storedChallenge = challenge.get();
		if (!storedChallenge) {
			throw new Error('No challenge token found');
		}

		if (abortController) {
			abortController.abort();
		}

		abortController = new AbortController();

		const response = await fetch(
			`${import.meta.env.VITE_HOST}/challenge?token=${storedChallenge}`,
			{
				signal: AbortSignal.any([abortController.signal, AbortSignal.timeout(5000)])
			}
		);

		if (!response.ok) {
			await challenge.set(undefined);
			const text = await response.text();
			throw new Error('Failed to fetch session data:' + text + ' ' + storedChallenge);
		}

		const { token } = await response.json();
		return token;
	}

	function tryAuthenticate() {
		const interval = setInterval(async () => {
			console.log('Checking authentication...');
			try {
				const session = await getSession();

				if (session) {
					console.log('Authenticated successfully:', session);
					clearInterval(interval);
					await browser.storage.local.set({
						[tokenKey]: session
					});
				}
			} catch (error) {
				console.error('Error during authentication:', error);
			}
		}, 3000);

		return () => {
			clearInterval(interval);
			if (abortController) {
				abortController.abort();
			}
		};
	}
</script>

<div class="w-max p-4">
	<h1>Wait for authentication</h1>
	<p>We are waiting for you to authenticate with the server.</p>
	{#if fallback}
		<a
			href="{import.meta.env.VITE_HOST}/challenge/{fallback}"
			target="_blank"
			class="text-underline mt-2">Open Tab manually</a
		>
	{:else}
		<button on:click={startChallenge} class="mt-2 bg-white p-4 text-black">
			Start authentication
		</button>
	{/if}
</div>
