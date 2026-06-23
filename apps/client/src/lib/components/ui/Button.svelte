<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    type?: 'button' | 'submit';
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    disabled?: boolean;
    full?: boolean;
    onclick?: () => void;
    children: Snippet;
  }

  let {
    type = 'button',
    variant = 'primary',
    size = 'md',
    disabled = false,
    full = false,
    onclick,
    children,
  }: Props = $props();

  const variants: Record<NonNullable<Props['variant']>, string> = {
    primary:
      'bg-primary text-primary-foreground hover:opacity-90 shadow-sm hover:shadow-md active:scale-[0.97]',
    secondary:
      'glass hover:glass-raised active:scale-[0.97]',
    ghost:
      'hover:bg-background/50 active:scale-[0.97]',
    danger:
      'border border-red-500/40 text-red-500 hover:bg-red-500/10 active:scale-[0.97]',
  };
</script>

<button
  {type}
  {disabled}
  {onclick}
  class="inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 {size ===
  'sm'
    ? 'px-2 py-1 text-xs'
    : 'px-3 py-1.5 text-sm'} {variants[variant]} {full ? 'w-full' : ''}"
>
  {@render children()}
</button>
