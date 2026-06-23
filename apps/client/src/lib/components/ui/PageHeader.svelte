<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    /** Optional breadcrumbs shown above the title */
    breadcrumbs?: { label: string; href?: string }[];
    actions?: Snippet;
  }

  let { title, description, breadcrumbs, actions }: Props = $props();
</script>

<div class="mb-8 animate-fade-in-up">
  {#if breadcrumbs}
    <nav class="mb-2 flex items-center gap-1.5 text-xs text-muted">
      {#each breadcrumbs as crumb, i}
        {#if i > 0}
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        {/if}
        {#if crumb.href}
          <a href={crumb.href} class="hover:text-foreground transition-colors">{crumb.label}</a>
        {:else}
          <span>{crumb.label}</span>
        {/if}
      {/each}
    </nav>
  {/if}
  <div class="flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">{title}</h1>
      {#if description}
        <p class="mt-1 text-sm text-muted">{description}</p>
      {/if}
    </div>
    {#if actions}
      <div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
    {/if}
  </div>
</div>
