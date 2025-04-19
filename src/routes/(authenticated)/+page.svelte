<script lang="ts">
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

<h1>Hello {data.user.username}</h1>
