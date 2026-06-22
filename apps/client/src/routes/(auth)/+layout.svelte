<script lang="ts">
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  let { children } = $props();
</script>

<div class="flex min-h-screen flex-col">
  <header class="flex items-center justify-between px-6 py-4">
    <span class="text-lg font-semibold">Free LLM Gateway</span>
    <ThemeToggle />
  </header>
  <main class="flex flex-1 items-center justify-center px-4 py-8">
    <div class="w-full max-w-sm">
      {@render children()}
    </div>
  </main>
</div>
