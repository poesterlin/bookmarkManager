<script lang="ts">
	import { IconLoader } from '@tabler/icons-svelte';

	interface Props {
		url: string;
		readonly?: boolean;
		onUrlChange?: (data: any) => void;
	}

	let { url = $bindable(), readonly = false, onUrlChange }: Props = $props();

	let loading = $state(false);
	let theme = $state<string>();
	let favicon = $state<string>();
	let faviconData = $state<string>();

	async function autofill() {
		if (!url) {
			return;
		}
		loading = true;

		try {
			const res = await fetch(`/info`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ url })
			});

			if (res.ok) {
				const data = await res.json();
				onUrlChange?.(data);
				theme = data.theme;
				favicon = data.favicon;
				faviconData = data.faviconData;
			}
		} catch (error) {
			console.error('Error during autofill fetch:', error);
		}

		loading = false;
	}
</script>

<div>
	<label for="url" class="block text-sm font-medium text-gray-700 dark:text-gray-200"> URL </label>
	<div class="input mt-1 flex overflow-hidden !p-0">
		{#if readonly}
			<input
				type="text"
				id="url"
				name="url"
				bind:value={url}
				readonly
				class="w-full cursor-not-allowed bg-gray-100 py-2 pl-2 opacity-50 focus:outline-0"
			/>
		{:else}
			<input
				type="text"
				id="url"
				name="url"
				bind:value={url}
				required
				class="w-full py-2 pl-2 focus:outline-0"
				placeholder="https://example.com"
				onblur={autofill}
			/>
		{/if}

		{#if loading && !faviconData}
			<IconLoader class="mx-2 h-10 animate-spin"></IconLoader>
		{/if}

		{#if faviconData}
			<img src={faviconData} alt="favicon" class="h-10 rounded-sm p-2" />
		{/if}
		{#if theme}
			<input type="hidden" name="theme" bind:value={theme} />
		{/if}
		{#if favicon}
			<input type="hidden" name="favicon" bind:value={favicon} />
		{/if}
	</div>
</div>
