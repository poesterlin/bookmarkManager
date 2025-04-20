<script lang="ts">
    import { flip } from 'svelte/animate';
    import { fade, fly } from 'svelte/transition';
    import BookmarkCard from './BookmarkCard.svelte';
    import EmptyState from './EmptyState.svelte';
	import type { Bookmark } from '$lib/server/db/schema';
    
    export let bookmarks: Bookmark[] = [];
  </script>
  
  <div class="space-y-4 fade-in">
    {#if bookmarks.length === 0}
      <EmptyState />
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each bookmarks as bookmark (bookmark.id)}
          <div 
            animate:flip={{ duration: 300 }}
            in:fly={{ y: 20, duration: 300, delay: 100 }}
            out:fade={{ duration: 200 }}
          >
            <BookmarkCard {bookmark} />
          </div>
        {/each}
      </div>
    {/if}
  </div>