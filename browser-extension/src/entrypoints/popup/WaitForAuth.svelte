<script lang="ts">
	import { storedValue, challengeKey, tokenKey } from './state.svelte';

	let abortController: AbortController | null = null;
	let challenge: {
		get: () => string | undefined;
		set: (value: string) => Promise<void>;
	};

	onMount(() => {
		let cleanup: () => void = () => {};

		storedValue<string | undefined>(challengeKey)
			.then(async (value) => {
				challenge = value;
				await startChallenge();
			})
			.then(() => {
				console.log('Starting challenge...', challenge.get());
				cleanup = tryAuthenticate();
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

		// open tab to authenticate
		await browser.tabs.create({
			url: `${import.meta.env.VITE_HOST}/challenge/${token}`,
			active: true
		});
	}

	async function getSession() {
		if (!challenge.get()) {
			throw new Error('No challenge token found');
		}

		if (abortController) {
			abortController.abort();
		}

		abortController = new AbortController();

		const response = await fetch(
			`${import.meta.env.VITE_HOST}/challenge?token=${challenge.get()}`,
			{
				signal: AbortSignal.any([abortController.signal, AbortSignal.timeout(5000)])
			}
		);

		if (!response.ok) {
			throw new Error('Failed to fetch session data');
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

		return () => clearInterval(interval);
	}
</script>

<div>
	<h1>Wait for authentication</h1>
	<p>We are waiting for you to authenticate with the server.</p>
</div>
