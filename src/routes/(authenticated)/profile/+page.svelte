<script lang="ts">
	import ConfirmSubmit from '$lib/client/components/input/ConfirmSubmit.svelte';
	import { IconLock, IconUserCircle } from '@tabler/icons-svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let user = data.user;

	const intl = new Intl.DateTimeFormat('en-US', {
		month: 'long',
		day: 'numeric',
		hour: 'numeric'
	});

	function formatDate(d: string | Date) {
		return intl.format(new Date(d));
	}

	let pinFormMessage = $state('');
	let showPinForm = $state(false);
	let showChangePin = $state(false);

	$effect(() => {
		if (form?.success) {
			pinFormMessage = 'PIN saved successfully!';
			showPinForm = false;
			showChangePin = false;
		} else if (form?.error) {
			pinFormMessage = form.error;
		}
	});
</script>

<div class="flex h-screen flex-col items-center justify-center">
	<div class="card w-max space-y-6 rounded-3xl bg-white p-8 text-center shadow-2xl">
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

		<div class="flex flex-col gap-8">
			<div class="border-t border-gray-200 pt-6 dark:border-gray-700">
				<div
					class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-700 dark:text-gray-300"
				>
					<IconLock class="h-5 w-5" />
					Secret Bookmarks PIN
				</div>

				{#if data.hasPin && !showChangePin}
					<p class="mb-4 text-sm text-gray-500">A PIN is set for your secret bookmarks.</p>
					<div class="flex gap-3">
						<button
							class="rounded-full bg-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
							onclick={() => (showChangePin = true)}
						>
							Change PIN
						</button>
						<form method="POST" action="?/remove-pin" use:enhance>
							{#snippet pinSlot()}
								<div class="mt-3">
									<label
										for="remove-pin-input"
										class="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400"
									>
										Enter your PIN to confirm
									</label>
									<input
										id="remove-pin-input"
										type="password"
										name="currentPin"
										required
										minlength="4"
										maxlength="6"
										inputmode="numeric"
										pattern="[0-9]*"
										autocomplete="off"
										placeholder="Current PIN"
										class="focus:border-primary-500 w-full rounded-lg border border-gray-300 px-4 py-2 text-center tracking-widest focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
									/>
								</div>
							{/snippet}
							<ConfirmSubmit
								formSlot={pinSlot}
								class="rounded-full bg-red-400 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-500"
							>
								Remove PIN
							</ConfirmSubmit>
						</form>
					</div>
				{:else if !data.hasPin && !showPinForm}
					<p class="mb-4 text-sm text-gray-500">
						Set a PIN to lock and unlock your secret bookmarks.
					</p>
					<button
						class="bg-primary-500 hover:bg-primary-600 rounded-full px-5 py-2 text-sm font-semibold text-white transition-all"
						onclick={() => (showPinForm = true)}
					>
						Set PIN
					</button>
				{/if}

				{#if showPinForm || showChangePin}
					<form method="POST" action="?/set-pin" use:enhance class="mt-4 space-y-4">
						{#if data.hasPin}
							<div>
								<label
									for="current-pin-input"
									class="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400"
								>
									Current PIN
								</label>
								<input
									id="current-pin-input"
									type="password"
									name="currentPin"
									required
									minlength="4"
									maxlength="6"
									inputmode="numeric"
									pattern="[0-9]*"
									autocomplete="off"
									placeholder="Current PIN"
									class="focus:border-primary-500 focus:ring-primary-200 w-full rounded-lg border border-gray-300 px-4 py-2 text-center tracking-widest focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
								/>
							</div>
						{/if}
						<div>
							<label
								for="new-pin-input"
								class="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400"
							>
								{data.hasPin ? 'New PIN' : 'PIN'}
							</label>
							<input
								id="new-pin-input"
								type="password"
								name="pin"
								required
								minlength="4"
								maxlength="6"
								inputmode="numeric"
								pattern="[0-9]*"
								autocomplete="off"
								placeholder="4-6 digit PIN"
								class="focus:border-primary-500 focus:ring-primary-200 w-full rounded-lg border border-gray-300 px-4 py-2 text-center tracking-widest focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
							/>
						</div>
						{#if pinFormMessage}
							<p
								class="text-sm"
								class:text-red-500={!form?.success}
								class:text-green-500={form?.success}
							>
								{pinFormMessage}
							</p>
						{/if}
						<div class="flex gap-3">
							<button
								type="submit"
								class="bg-primary-500 hover:bg-primary-600 rounded-full px-5 py-2 text-sm font-semibold text-white transition-all"
							>
								Save PIN
							</button>
							<button
								type="button"
								class="rounded-full bg-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
								onclick={() => {
									showPinForm = false;
									showChangePin = false;
									pinFormMessage = '';
								}}
							>
								Cancel
							</button>
						</div>
					</form>
				{/if}
			</div>
			<a
				href="/privacy"
				class="m-auto w-max rounded-full px-6 font-semibold tracking-wider text-slate-600 transition-all duration-300 hover:underline focus:ring-2 focus:ring-slate-200 focus:outline-none"
				>Privacy Policy</a
			>

			<a
				href="/export"
				download="bookmarks.html"
				class="m-auto w-max rounded-full px-6 font-semibold tracking-wider text-slate-600 transition-all duration-300 hover:underline focus:ring-2 focus:ring-slate-200 focus:outline-none"
				>Export Bookmarks
			</a>

			<form method="POST" action="/logout">
				<button
					class="rounded-full bg-white px-6 font-semibold tracking-wider text-slate-600 transition-all duration-300 hover:underline focus:ring-2 focus:ring-slate-200 focus:outline-none"
					type="submit">Logout</button
				>
			</form>

			<form action="?/delete" method="POST">
				<ConfirmSubmit
					class="rounded-full bg-red-400 px-4 py-3 font-semibold tracking-wider text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl focus:ring-2 focus:ring-slate-200 focus:outline-none"
				>
					Delete Account
				</ConfirmSubmit>
			</form>
		</div>
	</div>
</div>
