<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    value: string;
    hint?: string;
    accent?: boolean;
    /** Optional SVG icon to display above the value */
    icon?: Snippet;
    /** Optional mini trend indicator */
    trend?: { direction: 'up' | 'down' | 'neutral'; label: string };
    class?: string;
  }

  let { label, value, hint, accent = false, icon, trend, class: klass = '' }: Props = $props();
</script>

<div
  class="glass rounded-xl p-4 transition-all duration-200 hover:shadow-lg {klass}"
>
  <div class="flex items-start justify-between">
    <div class="min-w-0 flex-1">
      <p class="text-sm text-muted">{label}</p>
      <p class="mt-1 animate-fade-in text-2xl font-semibold tracking-tight {accent ? 'text-primary' : ''}">{value}</p>
    </div>
    {#if icon}
      <div class="ml-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {@render icon()}
      </div>
    {/if}
  </div>
  <div class="mt-2 flex items-center gap-2">
    {#if hint}
      <p class="text-xs text-muted">{hint}</p>
    {/if}
    {#if trend}
      <span
        class="inline-flex items-center gap-0.5 text-xs font-medium {trend.direction === 'up'
          ? 'text-green-500'
          : trend.direction === 'down'
            ? 'text-red-500'
            : 'text-muted'}"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          {#if trend.direction === 'up'}
            <path d="M18 15l-6-6-6 6" />
          {:else if trend.direction === 'down'}
            <path d="M6 9l6 6 6-6" />
          {:else}
            <path d="M5 12h14" />
          {/if}
        </svg>
        {trend.label}
      </span>
    {/if}
  </div>
</div>
