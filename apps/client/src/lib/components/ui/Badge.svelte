<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tone?: 'neutral' | 'success' | 'warning' | 'danger';
    children: Snippet;
  }

  let { tone = 'neutral', children }: Props = $props();

  const tones: Record<NonNullable<Props['tone']>, string> = {
    neutral: 'bg-background text-muted border-border',
    success: 'bg-green-500/10 text-green-500 border-green-500/30',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    danger: 'bg-red-500/10 text-red-500 border-red-500/30',
  };
</script>

<span
  class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium {tones[tone]}"
>
  {@render children()}
</span>
