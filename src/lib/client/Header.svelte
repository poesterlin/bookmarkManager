<script lang="ts">
	import { page } from "$app/state";
	import { IconUserCircle } from "@tabler/icons-svelte";

  </script>
  
  <header class="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
    <div class="flex items-center">
      <div class="flex items-center">
        <span class="text-primary-500 text-2xl font-bold mr-1">Bookmark</span>
        <span class="text-secondary-500 text-2xl font-bold">Buddy</span>
      </div>
    </div>
  
    <!-- <div class="flex-1 flex gap-1 items-center max-w-lg mx-4 input !p-0 focus-within:!border-primary-500 focus-within:!ring-0">
        <IconSearch
          class="text-gray-500 ml-3"
          size={20}
          stroke-width={1.5}
        />
        <input
          type="text"
          placeholder="Search bookmarks..."
          class="w-full p-2 bg-transparent border-none focus:outline-none"
          bind:value={searchQuery}
        />
    </div> -->
  
    <div class="flex items-center">
      <a href="/profile" aria-current={page.url.pathname === '/profile'}>
        <IconUserCircle class="m-auto h-8 w-8 -translate-y-0.5 text-slate-500"></IconUserCircle>
      </a>
    </div>
  </header>