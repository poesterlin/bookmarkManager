<script lang="ts">
	import { enhance } from '$app/forms';
	import { fade } from 'svelte/transition';

	interface Props {
		onClose: () => void;
		formAction: string;
		submitLabel: string;
		header: string;
		subHeader: string;
		onSubmit: () => void;
		children: any;
	}

	let { onClose, formAction, submitLabel, header, subHeader, onSubmit, children }: Props = $props();

	let form: HTMLFormElement;
	let submitting = $state(false);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onClose();
		}
		if (event.ctrlKey && event.key === 'Enter' && form) {
			event.preventDefault();
			form.requestSubmit();
		}
	}
</script>

<div class="" transition:fade={{ duration: 150 }}>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<form
		onkeydown={handleKeydown}
		bind:this={form}
		use:enhance={() => {
			submitting = true;
			return async ({ update, result }) => {
				submitting = false;
				if (result.type === 'success' || result.type === 'redirect') {
					onSubmit();
					onClose();
				}
				await update();
			};
		}}
		class="glass rounded-xl p-8 shadow-lg"
		method="POST"
		action={formAction}
	>
		<div class="mb-4">
			<h3 class="text-primary-700 dark:text-primary-300 text-2xl font-bold">{header}</h3>
			<p class="text-sm text-gray-600 dark:text-gray-300">{subHeader}</p>
		</div>

		<div class="space-y-4">
			{@render children()}
		</div>

		<div class="mt-6 flex justify-end space-x-3">
			<button type="button" class="button-ghost" onclick={onClose} disabled={submitting}>
				Cancel
			</button>
			<button type="submit" class="button-primary" disabled={submitting}>
				{#if submitting}
					<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
				{:else}
					{submitLabel}
				{/if}
			</button>
		</div>
	</form>
</div>
