<script lang="ts">
  import { themeStore } from '$lib/stores/theme.svelte';
</script>

<button
  type="button"
  class="rounded border border-border px-3 py-1 text-sm hover:bg-surface"
  onclick={() => themeStore.toggle()}
>
  {themeStore.current === 'dark' ? 'Light' : 'Dark'} mode
</button>
