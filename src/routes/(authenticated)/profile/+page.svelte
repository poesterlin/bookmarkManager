<script lang="ts">
	import { IconBell, IconBellRingingFilled, IconUserCircle } from '@tabler/icons-svelte';

	let { data } = $props();
	let user = data.user;

	const intl = new Intl.DateTimeFormat('en-US', {
		month: 'long',
		day: 'numeric',
		hour: 'numeric'
	});

	function formatDate(d: string | Date) {
		return intl.format(new Date(d));
	}
</script>

<div class="flex h-full flex-col items-center justify-center">
	<div class="card min-w-sm w-max space-y-6 rounded-3xl bg-white p-8 text-center shadow-2xl">
		<IconUserCircle class="mx-auto h-24 w-24 text-slate-500"></IconUserCircle>

		<h1 class="text-4xl font-extrabold text-slate-500 drop-shadow-md">{user.username}</h1>

		<p class="text-lg text-gray-700">
			Email:
			{#if user.email}
				<span class="font-semibold">{user.email}</span>
			{:else}
				<span class="font-semibold">Not Provided</span>
			{/if}
		</p>
		<p class="text-lg text-gray-700">
			Last Login:
			<span class="font-semibold">{user.lastLogin ? formatDate(user.lastLogin!) : 'Never'}</span>
		</p>
		<p class="mb-12 text-lg text-gray-700">
			Created At: <span class="font-semibold">{formatDate(user.createdAt)}</span>
		</p>

		<div class="flex flex-col space-y-8">
			<form method="POST" action="/logout">
				<button
					class="rounded-full bg-white px-6 py-3 font-semibold tracking-wider text-slate-500 shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-slate-200"
					type="submit">Logout</button
				>
			</form>

			<form action="?/delete" method="POST">
				<button
					class="rounded-full bg-red-400 px-4 py-3 font-semibold tracking-wider text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-slate-200"
					type="submit"
				>
					Delete Account</button
				>
			</form>
		</div>
	</div>
</div>
