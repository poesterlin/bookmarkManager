<script lang="ts">
	let { data } = $props();
</script>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900"
>
	<div class="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-800">
		<h1 class="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Connect browser extension</h1>
		<p class="mb-6 text-gray-700 dark:text-gray-300">
			A browser extension wants to access your bookmarks as
			<b class="font-semibold">{data.user.username}</b>. Only continue if you just started the login
			from the extension yourself.
		</p>
		<form method="POST">
			<button
				type="submit"
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-900"
			>
				Allow access
			</button>
		</form>
		<a href="/" class="mt-4 inline-block text-sm text-gray-500 hover:underline dark:text-gray-400">
			Cancel
		</a>
	</div>
</div>
