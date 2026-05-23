<script lang="ts">
	import { storedValue, challengeKey, tokenKey, type StoredValue } from './state.svelte';

	let abortController: AbortController | null = null;
	let challenge: StoredValue<string | undefined>;
	let fallback: string = $state('');
	let status = $state<'idle' | 'waiting' | 'error'>('idle');

	onMount(() => {
		let cleanup = () => {};

		storedValue<string | undefined>(challengeKey)
			.then(async (value) => {
				challenge = value;
				if (challenge.get()) {
					fallback = challenge.get()!;
				}
				await startChallenge();
			})
			.then(() => {
				cleanup = tryAuthenticate();
			})
			.catch(() => {
				status = 'error';
			});

		return () => {
			cleanup();
		};
	});

	async function startChallenge() {
		if (challenge.get()) {
			return;
		}

		status = 'waiting';

		const response = await fetch(import.meta.env.VITE_HOST + '/challenge', { method: 'POST' });

		if (!response.ok) {
			status = 'error';
			throw new Error('Failed to fetch challenge token');
		}

		const { token } = await response.json();
		await challenge.set(token);

		fallback = token;

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
			try {
				const session = await getSession();

				if (session) {
					clearInterval(interval);
					await browser.storage.local.set({
						[tokenKey]: session
					});
				}
			} catch (error) {
				if (!challenge.get()) {
					try {
						await startChallenge();
					} catch {
						status = 'error';
					}
				}
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

<div class="flex h-full flex-col items-center justify-center p-6 space-y-4">
	<h1 class="text-lg font-semibold text-gray-900 dark:text-white">Authentication Required</h1>
	{#if status === 'waiting'}
		<p class="text-sm text-gray-600 dark:text-gray-400 text-center">
			A browser tab was opened for you to sign in. Once authenticated, this popup will continue automatically.
		</p>
	{:else if status === 'error'}
		<p class="text-sm text-red-600 dark:text-red-400 text-center">
			Failed to start authentication. Please try again.
		</p>
	{/if}

	{#if fallback}
		<a
			href="{import.meta.env.VITE_HOST}/challenge/{fallback}"
			target="_blank"
			class="text-sm text-primary-600 dark:text-primary-400 underline mt-2"
		>Open Tab manually</a
		>
	{:else}
		<button onclick={() => startChallenge().catch(() => (status = 'error'))} class="button-primary mt-2">
			Start authentication
		</button>
	{/if}
</div>
