<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import type { Category } from '$lib/server/db/schema';
	import {
		IconArchive,
		IconEdit,
		IconEyeEdit,
		IconFolder,
		IconFriends,
		IconPlus,
		IconShare,
		IconStar,
		IconWorld
	} from '@tabler/icons-svelte';
	import { replaceQueryParam } from '../util';
	import { dragStore } from '../stores/drag-store.svelte';

	interface Props {
		handleAddBookmark: () => void;
		categories: Category[];
		shared: { name: string | null; id: string }[];
		isMenuOpen?: boolean;
		shareModalHandler: { open: () => void; close: () => void };
	}

	let {
		handleAddBookmark,
		categories,
		shared,
		isMenuOpen = $bindable(false),
		shareModalHandler
	}: Props = $props();

	let isSwiping = $state(false);
	let startX = 0;
	let startY = 0;
	let deltaX = $state(0);
	let startTime = 0;

	// --- Constants ---
	const MIN_SWIPE_DISTANCE = [100, 70] as const; // Pixels needed to trigger open/close
	const VERTICAL_CANCEL_THRESHOLD = [70, 70] as const; // Max vertical movement allowed for a horizontal swipe
	const MIN_VELOCITY_THRESHOLD = [0.8, 1] as const; // Pixels per millisecond (adjust as needed)

	beforeNavigate(() => {
		if (isMenuOpen) {
			isMenuOpen = false;
		}
	});

	$effect(() => {
		document.body.style.userSelect = isMenuOpen || Math.abs(deltaX) > 10 ? 'none' : '';
	});

	function startSwipe(event: PointerEvent) {
		// Only track primary pointer (e.g., first finger, left mouse button)
		if (!event.isPrimary) return;

		// prevent starting swipe if the target element has horizontal scroll
		const targetElement = event.target as HTMLElement;
		if (isHorizontallyScrollableOrParent(targetElement)) {
			console.log('swipe canceled: target element has horizontal scroll');
			return;
		}

		isSwiping = true;
		startX = event.clientX;
		startY = event.clientY;
		startTime = Date.now();
		deltaX = 0; // Reset deltaX at the start
	}

	// Function to check if the element or any parent has horizontal scroll
	function isHorizontallyScrollableOrParent(element: HTMLElement | null) {
		let currentElement = element;
		while (currentElement) {
			if (hasHorizontalScroll(currentElement)) {
				console.log('element:', currentElement, 'has horizontal scroll');
				return true;
			}
			currentElement = currentElement.parentElement;
		}
		return false;
	}

	function hasHorizontalScroll(element: HTMLElement) {
		if (!element) {
			return false;
		}

		// ignore elements with class "ignore-scroll"
		if (element.classList.contains('ignore-scroll')) {
			return false;
		}

		return element.scrollWidth > element.clientWidth;
	}

	function swipe(event: PointerEvent | TouchEvent | Touch) {
		if (!isSwiping) {
			return;
		}

		let currentEvent: PointerEvent = event as any; // Use a variable to hold the correct event type
		let isTouch = false;

		if (event instanceof PointerEvent) {
			isTouch = event.pointerType === 'touch';
		}

		if (event instanceof TouchEvent) {
			// If multiple touches, cancel swipe
			if (event.touches.length > 1) {
				endSwipe();
				return;
			}
			isTouch = true;
			currentEvent = event.touches[0] as unknown as PointerEvent;
		} else if (event instanceof PointerEvent && !event.isPrimary) {
			// Ignore non-primary pointer events during move
			return;
		}

		// Check for excessive vertical movement first
		if (Math.abs(currentEvent.clientY - startY) > get(VERTICAL_CANCEL_THRESHOLD, isTouch)) {
			endSwipe();
			return;
		}

		// Calculate movement delta
		deltaX = startX - currentEvent.clientX;
		const currentTime = Date.now();
		const deltaTime = currentTime - startTime;

		// Check if distance threshold is met
		const absDeltaX = Math.abs(deltaX);

		let velocityX = 0;
		if (deltaTime > 0) {
			velocityX = absDeltaX / deltaTime; // Use absDeltaX for velocity magnitude check
		}

		if (
			absDeltaX > get(MIN_SWIPE_DISTANCE, isTouch) ||
			velocityX > get(MIN_VELOCITY_THRESHOLD, isTouch)
		) {
			if (deltaX > 0) {
				// Swiped left
				isMenuOpen = false;
				endSwipe(true); // Indicate swipe completed
			} else {
				// Swiped right
				isMenuOpen = true;
				endSwipe(true); // Indicate swipe completed
			}
		}
		// If distance threshold not met, deltaX is updated for the style:translate, but no trigger happens yet.
	}

	// Added optional parameter to know if swipe action was completed
	function endSwipe(swipeCompleted = false) {
		if (!isSwiping) return;

		isSwiping = false;
		// Don't reset deltaX immediately if swipe wasn't completed,
		// allow animation back if needed (handled by CSS transition)
		// If swipe WAS completed, menu state changes and CSS handles the final position.
		// Resetting deltaX here might cause a flicker if CSS transition isn't instant.
		// Let's reset deltaX only if the swipe *didn't* complete, to snap back.
		if (!swipeCompleted) {
			deltaX = 0;
		}

		// Reset start time
		startTime = 0;
	}
	function toPercent(valueInPixels: number) {
		if (valueInPixels === 0) {
			return '';
		}

		const sliderWidth = (64 / 4) * 16;
		const originalPercent = isMenuOpen ? 0 : 1;
		const movePercent = valueInPixels / sliderWidth;
		const sum = originalPercent + movePercent;
		const clamped = Math.min(1, Math.max(0, sum));
		return `-${clamped * 100}%`;
	}

	function get(val: readonly [number, number], isTouch: boolean) {
		if (isTouch) {
			return val[1];
		}
		return val[0];
	}

	function cancelOnSelect() {
		const selection = document.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			if (range.startOffset > 1) {
				console.log('swipe canceled: text selected');
				endSwipe();
			}
		}
	}
</script>

<svelte:window
	onpointerup={() => endSwipe()}
	ontouchend={() => endSwipe()}
	onpointerdown={startSwipe}
	ontouchcancel={() => endSwipe()}
	onpointermove={swipe}
	ontouchmove={swipe}
	onselectionchangecapture={cancelOnSelect}
	onkeydown={(e) => {
		if (e.key === 'Escape' && isMenuOpen) {
			isMenuOpen = false;
		}
	}}
/>

<!-- backdrop -->
{#if isMenuOpen}
	<button
		type="button"
		aria-label="Close menu"
		class="fixed inset-0 z-30 bg-transparent md:hidden"
		onclick={() => (isMenuOpen = false)}
	></button>
{/if}

{#snippet categoryLink(id: string, name: string, shared: boolean)}
	<a
		data-sveltekit-replacestate
		href={replaceQueryParam(page.url, ['archived', 'favorite'], 'category', id)}
		class="flex w-full items-center rounded-lg px-3 py-2 text-left transition-all dark:hover:bg-white/10
			{page.url.searchParams.get('category') === id
			? 'bg-secondary-100 text-secondary-700 dark:text-secondary-200 font-medium dark:bg-transparent dark:outline dark:focus:underline  dark:focus:outline-gray-100	'
			: 'text-gray-700 hover:bg-white/50 dark:text-gray-200'}"
	>
		{#if shared}
			<IconShare class="mr-2 h-5 w-5" />
		{:else}
			<IconFolder class="mr-2 h-5 w-5" />
		{/if}
		<span>{name}</span>
	</a>
{/snippet}

<!-- sidebar -->
<aside
	class="glass fixed z-40 h-[calc(100vh-68px)] w-64 overflow-y-auto transition-transform duration-300 ease-in-out will-change-transform md:static md:!translate-0 dark:!border-0"
	style:translate={toPercent(deltaX)}
	class:immediate={isSwiping}
	class:hide={!isMenuOpen}
>
	<div class="p-4">
		<button
			class="button-primary mb-6 flex w-full items-center justify-center"
			onclick={handleAddBookmark}
		>
			<IconPlus class="mr-2" />
			Add Bookmark
		</button>

		<nav class="space-y-1">
			<a
				data-sveltekit-replacestate
				class="flex w-full items-center rounded-lg px-3 py-2 text-left transition-all dark:hover:bg-white/10
              {Array.from(page.url.searchParams.entries()).length === 0
					? 'bg-primary-100 text-primary-700 dark:text-primary-200 font-medium dark:bg-transparent dark:outline dark:focus:underline  dark:focus:outline-gray-100'
					: 'text-gray-700 hover:bg-white/50 dark:text-gray-200 '}"
				href="/"
			>
				<IconWorld class="mr-2 h-5 w-5" />
				All Bookmarks
			</a>
			<a
				data-sveltekit-replacestate
				class="flex w-full items-center rounded-lg px-3 py-2 text-left transition-all dark:hover:bg-white/10
              {page.url.searchParams.has('favorite')
					? 'bg-primary-100 text-primary-700 dark:text-primary-200 font-medium dark:bg-transparent dark:outline dark:focus:underline  dark:focus:outline-gray-100'
					: 'text-gray-700 hover:bg-white/50 dark:text-gray-200'}"
				href={replaceQueryParam(page.url, ['archived', 'category'], 'favorite')}
			>
				<IconStar class="mr-2 h-5 w-5" />
				Favorites
			</a>
			<a
				data-sveltekit-replacestate
				class="flex w-full items-center rounded-lg px-3 py-2 text-left transition-all dark:hover:bg-white/10
              {page.url.searchParams.has('archived')
					? 'bg-primary-100 text-primary-700 dark:text-primary-200 font-medium dark:bg-transparent dark:outline dark:focus:underline  dark:focus:outline-gray-100'
					: 'text-gray-700 hover:bg-white/50 dark:text-gray-200'}"
				href={replaceQueryParam(page.url, ['favorite', 'category'], 'archived')}
			>
				<IconArchive class="mr-2 h-5 w-5" />
				Archive
			</a>
		</nav>

		{#if categories.length > 0 || shared.length > 0}
			<div class="mt-6 mb-3 flex items-center justify-between text-gray-500 dark:text-gray-400">
				<h3 class="!mb-0 px-3 text-xs font-semibold tracking-wider uppercase">Categories</h3>

				<button
					onclick={shareModalHandler.open}
					class="flex items-center justify-center rounded-full p-1.5 outline-gray-300 hover:outline dark:hover:outline-gray-600"
				>
					<IconEdit class="h-4 w-4">
						<span class="sr-only">Manage a Category</span>
					</IconEdit>
				</button>
			</div>
			<nav class="space-y-1">
				{#each categories as category}
					<div
						onpointerup={() => dragStore.addToCategory(category)}
						class="flex items-center gap-2"
					>
						{@render categoryLink(category.id, category.name, false)}
					</div>
				{/each}

				{#each shared as category}
					{#if category.name}
						{@render categoryLink(category.id, category.name, true)}
					{/if}
				{/each}
			</nav>
		{/if}
	</div>
</aside>

<!-- fab -->
<button
	class="bg-primary-500 hover:bg-primary-600 focus:ring-primary-500 dark:bg-primary-600 dark:hover:bg-primary-700 fixed right-8 bottom-10 z-50 flex h-12 w-18 items-center justify-center rounded-full text-white shadow-xl transition-transform duration-300 ease-in-out focus:ring-2 focus:ring-offset-2 focus:outline-none md:hidden dark:focus:ring-offset-gray-800"
	onclick={handleAddBookmark}
	style:transform={isMenuOpen ? 'translateX(15rem)' : 'translateX(0)'}
>
	<IconPlus class="h-6 w-6" />
</button>

<style>
	.immediate {
		transition: none;
	}

	.hide {
		translate: -100%;
	}
</style>
