<script lang="ts">
	export let href: string = '';
	export let primary: boolean = false;
	export let small: boolean = false;
	export let full: boolean = false;
</script>

<a
	{href}
	class="
      inline-block text-center
      {primary
		? 'bg-primary-500 hover:bg-primary-600 text-white'
		: 'bg-gray-800 text-white hover:bg-gray-700'}
      {small ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-base'}
      {full ? 'w-full' : ''}
      focus:ring-primary-500 focus:ring-opacity-50
      transform rounded-full font-medium
      transition-all duration-300
      hover:-translate-y-1 hover:shadow-lg focus:ring-2 focus:outline-none
    "
>
	<slot />
</a>
