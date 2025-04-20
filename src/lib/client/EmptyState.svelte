<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    function addBookmark() {
      dispatch('add');
    }
  </script>
  
  <div class="glass rounded-xl p-8 text-center flex flex-col items-center">
    <div class="w-32 h-32 mx-auto mb-6 animate-float">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" stroke="url(#paint0_linear)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
          <linearGradient id="paint0_linear" x1="5" y1="12" x2="19" y2="12" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FF6B98"/>
            <stop offset="1" stop-color="#A17FE0"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    
    <h3 class="text-xl font-bold text-gray-800 mb-2">No bookmarks found</h3>
    <p class="text-gray-600 mb-6 max-w-sm mx-auto">Start adding bookmarks to your collection to see them here.</p>
    
    <button 
      class="button-primary"
      on:click={addBookmark}
    >
      Add Your First Bookmark
    </button>
  </div>