<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { themeStore } from '$lib/stores/theme.svelte';

  let { children } = $props();

  // Sync the store with the persisted theme once mounted (the inline script already set the DOM).
  onMount(() => themeStore.init());
</script>

<div class="min-h-screen bg-background text-foreground">
  {@render children()}
</div>
