<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { IconLock } from '@tabler/icons-svelte';
	import Modal from './Modal.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount } from 'svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let inputEl = $state<HTMLInputElement>();
	let error = $state('');
	let loading = $state(false);

	const handleEnhance: SubmitFunction = () => {
		loading = true;
		error = '';
		return async ({ result }) => {
			loading = false;
			if (result.type === 'failure') {
				error = result.data?.error ?? 'Incorrect PIN';
			} else if (result.type === 'success') {
				await invalidateAll();
				onClose();
			}
		};
	};

	$effect(() => {
		inputEl?.focus();
	});
</script>

<Modal {onClose}>
	<form method="POST" action="?/unlock" use:enhance={handleEnhance} class="space-y-6 p-6">
		<div class="text-center">
			<IconLock class="mx-auto h-12 w-12 text-slate-500" />
			<h2 class="mt-3 text-xl font-semibold text-gray-900 dark:text-gray-100">Unlock Secrets</h2>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Enter your PIN to view secret bookmarks
			</p>
		</div>

		<div>
			<input
				type="password"
				name="pin"
				required
				minlength="4"
				maxlength="6"
				inputmode="numeric"
				pattern="[0-9]*"
				autocomplete="off"
				placeholder="Enter PIN"
				bind:this={inputEl}
				class="focus:border-primary-500 focus:ring-primary-200 dark:focus:border-primary-400 w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-widest focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
			/>
			{#if error}
				<p class="mt-2 text-sm text-red-500">{error}</p>
			{/if}
		</div>

		<button type="submit" disabled={loading} class="button-primary w-full py-3">
			{loading ? 'Unlocking...' : 'Unlock'}
		</button>
	</form>
</Modal>
