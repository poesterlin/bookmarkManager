<script lang="ts">
    const screenshots = [
      {
        src: "/screenshots/home_desktop.webp",
        alt: "BookmarkManager Desktop View",
        title: "Desktop Experience",
        description: "Powerful organization with a clean interface on larger screens"
      },
      {
        src: "/screenshots/home_mobile.webp",
        alt: "BookmarkManager Mobile View",
        title: "Mobile Experience",
        description: "Take your bookmarks anywhere with our responsive mobile design"
      }
    ];
  </script>
  
  <section id="screenshots" class="py-16 md:py-24">
    <div class="container mx-auto px-4">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold mb-4">Experience BookmarkManager</h2>
        <p class="text-lg text-gray-300 max-w-2xl mx-auto">
          A beautiful interface that works on any device, keeping your bookmarks accessible wherever you go.
        </p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
        {#each screenshots as screenshot, i}
          <div class="group relative bg-gray-800 rounded-2xl overflow-hidden shadow-xl {i === 0 ? 'md:transform md:-rotate-1' : 'md:transform md:rotate-1'}">
            <img 
              src={screenshot.src} 
              alt={screenshot.alt} 
              class="w-full h-auto group-hover:opacity-85 transition-opacity duration-300" 
            />
            <div class="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-gray-900 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <h3 class="text-2xl font-bold mb-2">{screenshot.title}</h3>
              <p class="text-gray-300">{screenshot.description}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>