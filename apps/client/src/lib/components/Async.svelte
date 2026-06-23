<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';

  interface Props {
    /** The async loader. Re-runs whenever its identity changes (e.g. a filter updates) or on reload. */
    load: () => Promise<T>;
    children: Snippet<[T, () => void]>;
    /** Optional: show skeleton variants instead of default text loading state */
    skeleton?: 'text' | 'card' | 'table';
  }

  let { load, children, skeleton = 'text' }: Props = $props();

  let trigger = $state(0);

  /** Forces a re-fetch (passed to children so they can refresh after a mutation). */
  function reload(): void {
    trigger += 1;
  }

  const promise = $derived.by(() => {
    void trigger;
    return load();
  });
</script>

{#await promise}
  {#if skeleton === 'text'}
    <div class="space-y-3">
      <Skeleton shape="text" />
      <Skeleton shape="text" class="w-3/4" />
      <Skeleton shape="text" class="w-1/2" />
    </div>
  {:else if skeleton === 'card'}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each [1, 2, 3, 4] as _}
        <Skeleton shape="card" class="h-28" />
      {/each}
    </div>
  {:else if skeleton === 'table'}
    <div class="space-y-2">
      <Skeleton shape="text" class="h-10" />
      {#each [1, 2, 3] as _}
        <Skeleton shape="text" class="h-8" />
      {/each}
    </div>
  {/if}
{:then data}
  {@render children(data, reload)}
{:catch error}
  <div class="flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
    <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>{error instanceof Error ? error.message : 'Failed to load'}</span>
  </div>
{/await}

