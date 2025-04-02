<script lang="ts">
	import '../app.css';
  import Sidebar from '$lib/Sidebar.svelte';
  import {Menu} from 'lucide-svelte'
	let { children } = $props();
	let showSidebar = $state(true);

	function toggleSidebar() {
		showSidebar = !showSidebar
	}
</script>

<header>
	<button onclick={toggleSidebar}>
		<Menu class="p-1 m-2 cursor-pointer" size="32px"/>
	</button>
</header>
<main class="flex h-full">
	{#if showSidebar}
		<Sidebar class="sidebar"/>
	{/if}
	<div class="flex-1 p-4">
		{@render children()}
	</div>
</main>

<style scoped>
.sidebar {
	max-height: 100vh;
	overflow-y: scroll;
}
</style>
