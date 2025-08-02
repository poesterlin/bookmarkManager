<script lang="ts">
	interface Props {
		title: string;
		description: string;
	}

	let { title = $bindable(), description  = $bindable()}: Props = $props();
</script>

<div>
	<label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
		Title</label
	>
	<input
		type="text"
		id="title"
		name="title"
		required
		bind:value={title}
		class="input mt-1 w-full"
		placeholder="My Awesome Website"
	/>
</div>

<div>
	<label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
		Description (optional)</label
	>
	<textarea
		id="description"
		name="description"
		class="input mt-1 w-full"
		rows="2"
		bind:value={description}
		placeholder="A brief description of the website"
	></textarea>
</div>
