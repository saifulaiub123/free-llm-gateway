<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  interface Props {
    items: T[];
    /** Stable key per item (used for keyed each + reorder identity). */
    getId: (item: T) => number | string;
    /** Called with the new order after a drag-drop completes. */
    onreorder: (items: T[]) => void;
    row: Snippet<[T, number]>;
  }

  let { items, getId, onreorder, row }: Props = $props();

  let dragIndex = $state<number | null>(null);

  /** Moves the dragged item to the drop target's index and emits the new order. */
  function drop(targetIndex: number): void {
    if (dragIndex === null || dragIndex === targetIndex) {
      dragIndex = null;
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    if (moved !== undefined) next.splice(targetIndex, 0, moved);
    dragIndex = null;
    onreorder(next);
  }
</script>

<ul class="space-y-2">
  {#each items as item, index (getId(item))}
    <li
      draggable="true"
      class="flex items-center gap-3 rounded border border-border bg-surface px-3 py-2 {dragIndex ===
      index
        ? 'opacity-50'
        : ''}"
      ondragstart={() => (dragIndex = index)}
      ondragover={(event) => event.preventDefault()}
      ondrop={() => drop(index)}
    >
      <span class="cursor-grab select-none text-muted" aria-hidden="true">⠿</span>
      <span class="w-6 text-xs text-muted">{index + 1}</span>
      <div class="min-w-0 flex-1">{@render row(item, index)}</div>
    </li>
  {/each}
</ul>
