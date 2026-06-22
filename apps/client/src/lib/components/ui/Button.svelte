<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    type?: 'button' | 'submit';
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    disabled?: boolean;
    full?: boolean;
    onclick?: () => void;
    children: Snippet;
  }

  let {
    type = 'button',
    variant = 'primary',
    disabled = false,
    full = false,
    onclick,
    children,
  }: Props = $props();

  const variants: Record<NonNullable<Props['variant']>, string> = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'border border-border bg-surface hover:bg-background',
    ghost: 'hover:bg-surface',
    danger: 'border border-red-500/40 text-red-500 hover:bg-red-500/10',
  };
</script>

<button
  {type}
  {disabled}
  {onclick}
  class="inline-flex items-center justify-center rounded px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 {variants[
    variant
  ]} {full ? 'w-full' : ''}"
>
  {@render children()}
</button>
