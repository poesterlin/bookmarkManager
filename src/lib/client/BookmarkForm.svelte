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

	function handleCtrlEnterSubmit(event: KeyboardEvent) {
		if (event.ctrlKey && event.key === 'Enter' && form) {
			event.preventDefault();
			form.requestSubmit();
		}
	}
</script>

<div class="" transition:fade={{ duration: 150 }}>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<form
		onkeyup={handleCtrlEnterSubmit}
		bind:this={form}
		use:enhance={() => {
			return ({ update }) => {
				onSubmit();
				onClose();
				update();
			};
		}}
		class="p-6"
		method="POST"
		action={formAction}
	>
		<div class="mb-4">
			<h3 class="text-primary-900 text-xl font-semibold">{header}</h3>
			<p class="text-sm text-gray-600">{subHeader}</p>
		</div>

		<div class="space-y-4">
			{@render children()}
		</div>

		<div class="mt-6 flex justify-end space-x-3">
			<button type="button" class="button-ghost" onclick={onClose}> Cancel </button>
			<button type="submit" class="button-primary"> {submitLabel} </button>
		</div>
	</form>
</div>
