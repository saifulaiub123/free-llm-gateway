<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { themeStore } from '$lib/stores/theme.svelte';

  let { children } = $props();

  // Sync the store with the persisted theme once mounted (the inline script already set the DOM).
  onMount(() => themeStore.init());
</script>

<div class="min-h-screen bg-background text-foreground">
  <header class="border-b border-border bg-surface">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <span class="text-lg font-semibold">Free LLM Gateway</span>
      <button
        type="button"
        class="rounded border border-border px-3 py-1 text-sm hover:bg-background"
        onclick={() => themeStore.toggle()}
      >
        {themeStore.current === 'dark' ? 'Light' : 'Dark'} mode
      </button>
    </div>
  </header>
  <main class="mx-auto max-w-5xl px-4 py-8">
    {@render children()}
  </main>
</div>
