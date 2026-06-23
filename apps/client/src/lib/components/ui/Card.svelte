<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    /** Visual variant: glass (default with blur), solid (opaque), raised (elevated shadow) */
    variant?: 'glass' | 'solid' | 'raised';
    /** Optional header title */
    title?: string;
    /** Optional header action snippet (shown right of title) */
    action?: Snippet;
    children: Snippet;
  }

  let { class: klass = '', variant = 'glass', title, action, children }: Props = $props();

  const variantStyles: Record<NonNullable<Props['variant']>, string> = {
    glass: 'glass',
    solid: 'glass-solid',
    raised: 'glass-raised',
  };
</script>

<div
  class="rounded-xl p-4 transition-all duration-200 hover:shadow-lg {variantStyles[variant]} {klass}"
>
  {#if title}
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold">{title}</h3>
      {#if action}
        {@render action()}
      {/if}
    </div>
  {/if}
  {@render children()}
</div>
