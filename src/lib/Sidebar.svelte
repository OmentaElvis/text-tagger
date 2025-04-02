<script>
    import { onMount } from 'svelte';
    import {Check} from 'lucide-svelte'
    let files = [];

    onMount(async () => {
        const response = await fetch('/api/files');
        if (response.ok) {
            const data = await response.json();
            files = data.files;
        } else {
            console.error('Failed to fetch files:', response.statusText);
        }
    });
</script>

<aside class="">
    <h2>File List</h2>
    <ul class="overflow-x-hidden">
        {#each files as file}
            <li class="cursor-pointer hover:bg-gray-200">
              <div class="relative">
                  {#if file.tagged}
                      <Check class="absolute text-green-600" />
                  {/if}
                  <a class="p-2 block" href={`/data/${encodeURIComponent(file.name)}`} >{file.name}</a>
              </div>
            </li>
        {/each}
    </ul>
</aside>

<style>
    aside {
        width: 250px;
        padding: 1rem;
        border-right: 1px solid #ccc;
        max-height: 100vh;
        overflow-y: scroll;
    }
</style>

