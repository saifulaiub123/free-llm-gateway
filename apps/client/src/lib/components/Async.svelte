<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The async loader. Re-runs whenever its identity changes (e.g. a filter updates) or on reload. */
    load: () => Promise<T>;
    children: Snippet<[T, () => void]>;
  }

  let { load, children }: Props = $props();

  let trigger = $state(0);

  /** Forces a re-fetch (passed to children so they can refresh after a mutation). */
  function reload(): void {
    trigger += 1;
  }

  // Re-derive the promise when `trigger` (explicit reload) or `load` (a changed filter) changes;
  // `{#await}` then renders the loading/error/loaded states with no effect assigning state.
  const promise = $derived.by(() => {
    void trigger;
    return load();
  });
</script>

{#await promise}
  <p class="text-sm text-muted">Loading…</p>
{:then data}
  {@render children(data, reload)}
{:catch error}
  <p class="text-sm text-red-500">{error instanceof Error ? error.message : 'Failed to load'}</p>
{/await}

