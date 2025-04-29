<script lang="ts">
    export let icon: keyof typeof iconMap;
    export let title: string;
    
    const iconMap = {
      bookmark: `M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z`,
      folder: `M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z`,
      search: `M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z`,
      tag: `M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z`,
      moon: `M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z`,
      share: `M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684>`
    };
  </script>
  
  <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 transition-all duration-300 hover:transform hover:scale-102 hover:shadow-lg border border-gray-700 hover:border-primary-500">
    <div class="flex items-start">
      <div class="bg-gradient-to-br from-primary-500 to-secondary-500 p-3 rounded-lg shadow-lg mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconMap[icon]} />
        </svg>
      </div>
    </div>
    
    <h3 class="text-xl font-semibold mb-2">{title}</h3>
    <p class="text-gray-300">
      <slot></slot>
    </p>
  </div>