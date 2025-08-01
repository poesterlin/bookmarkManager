<script lang="ts">
	import type { Snippet } from 'svelte';
	import Modal from './Modal.svelte';
	import { assert, assertInstanceOf } from './util';

	type Props = {
		children: Snippet;
		class: string;
	};

	let { children, ...rest }: Props = $props();

	let openDialog = $state(false);

	function handleClick(event: MouseEvent) {
		event.preventDefault();
		openDialog = true;
	}

	async function sendAction(event: MouseEvent) {
		const target = event.target;
		assert(target, 'Target is missing');
		assertInstanceOf(target, HTMLElement);
		const form = target.closest('form');
		assert(form, 'form not found');

		const action = form.action;
		const body = new FormData(form);

		await fetch(action, { method: 'POST', body });

		openDialog = false;
	}
</script>

<button type="button" onclick={handleClick} {...rest}>
	{@render children()}
</button>

{#if openDialog}
	<Modal onClose={() => (openDialog = false)} class="p-4">
		<h2 class="text-xl font-bold">Are you sure?</h2>
		<p class="mt-2">This action cannot be undone.</p>

		<div class="mt-4 flex justify-between">
			<button
				autofocus
				type="button"
				class="mr-2 rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
				onclick={() => (openDialog = false)}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="flex items-center gap-2 rounded bg-red-400 px-4 py-2 text-white hover:bg-red-700"
				onclick={sendAction}
			>
				{@render children()}
			</button>
		</div>
	</Modal>
{/if}
