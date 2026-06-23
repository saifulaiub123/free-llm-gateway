<script lang="ts">
  interface Props {
    /** 0..1 or 0..100 — auto‑detects which range */
    value: number;
    class?: string;
    /** Show percentage label to the right */
    showLabel?: boolean;
  }

  let { value, class: klass = '', showLabel = false }: Props = $props();

  // Normalize to 0..100
  const pct = $derived(value <= 1 ? Math.round(value * 100) : Math.min(value, 100));
</script>

<div class="flex items-center gap-2 {klass}">
  <div class="h-2 flex-1 overflow-hidden rounded-full bg-surface">
    <div
      class="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
      style="width: {pct}%"
    ></div>
  </div>
  {#if showLabel}
    <span class="text-xs tabular-nums text-muted">{pct}%</span>
  {/if}
</div>