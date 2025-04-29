<script lang="ts">
    import Button from "./Button.svelte";
  </script>
  
  <section class="pt-32 pb-16 md:pt-40 md:pb-24">
    <div class="container mx-auto px-4">
      <div class="flex flex-col md:flex-row items-center">
        <div class="md:w-1/2 text-center md:text-left mb-12 md:mb-0">
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            <span class="text-primary-500">Save</span> and <span class="text-secondary-400">organize</span> your bookmarks <span class="text-accent-400">seamlessly</span>.
          </h1>
          
          <p class="text-xl text-gray-300 mb-8 max-w-lg mx-auto md:mx-0">
            A simple yet powerful bookmark manager that helps you organize, search, and access your favorite websites in one place.
          </p>
          
          <div class="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Button href="/login" primary>
              Try Now
            </Button>
            <Button href="#features">
              Learn More
            </Button>
          </div>
        </div>
        
        <div class="md:w-1/2 relative">
          <div class="rounded-2xl overflow-hidden shadow-2xl animate-float">
            <img 
              src="/screenshots/home_desktop.webp" 
              alt="BookmarkManager Desktop View" 
              class="w-full h-auto rounded-2xl" 
            />
            <div class="absolute -bottom-4 -right-4 w-40 h-auto rounded-xl overflow-hidden shadow-xl border-4 border-gray-900">
              <img 
                src="/screenshots/home_mobile.webp" 
                alt="BookmarkManager Mobile View" 
                class="w-full h-auto" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>