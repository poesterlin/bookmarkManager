<script lang="ts">
	import { IconCheck, IconX, IconInfoCircle } from '@tabler/icons-svelte';
	import { getToasts } from './toast.svelte';

	const icons: Record<string, typeof IconCheck> = {
		success: IconCheck,
		error: IconX,
		info: IconInfoCircle
	};

	const colorClasses: Record<string, string> = {
		success: 'border-green-400 bg-green-50 dark:bg-green-900/30 dark:border-green-600',
		error: 'border-red-400 bg-red-50 dark:bg-red-900/30 dark:border-red-600',
		info: 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600'
	};

	const textColors: Record<string, string> = {
		success: 'text-green-700 dark:text-green-300',
		error: 'text-red-700 dark:text-red-300',
		info: 'text-blue-700 dark:text-blue-300'
	};

	const iconColors: Record<string, string> = {
		success: 'text-green-500',
		error: 'text-red-500',
		info: 'text-blue-500'
	};
</script>

{#each getToasts() as toast (toast.id)}
	<div
		class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg {colorClasses[
			toast.type
		]} fade-in"
	>
		{#if icons[toast.type]}
			<svelte:component
				this={icons[toast.type]}
				class="h-4 w-4 flex-shrink-0 {iconColors[toast.type]}"
			/>
		{/if}
		<span class={textColors[toast.type]}>{toast.message}</span>
	</div>
{/each}
