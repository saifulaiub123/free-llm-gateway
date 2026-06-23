<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tone?: 'neutral' | 'success' | 'warning' | 'danger';
    /** Show a colored dot indicator before the text */
    dot?: boolean;
    children: Snippet;
  }

  let { tone = 'neutral', dot = false, children }: Props = $props();

  const tones: Record<NonNullable<Props['tone']>, { class: string; dot: string }> = {
    neutral: {
      class: 'bg-surface text-muted border-border',
      dot: 'bg-muted',
    },
    success: {
      class: 'bg-green-500/10 text-green-500 border-green-500/20',
      dot: 'bg-green-500',
    },
    warning: {
      class: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      dot: 'bg-amber-500',
    },
    danger: {
      class: 'bg-red-500/10 text-red-500 border-red-500/20',
      dot: 'bg-red-500',
    },
  };
</script>

<span
  class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium {tones[tone].class}"
>
  {#if dot}
    <span class="inline-block h-1.5 w-1.5 rounded-full {tones[tone].dot}"></span>
  {/if}
  {@render children()}
</span>
