<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Tooltip text content */
    content: string;
    children: Snippet;
  }

  let { content, children }: Props = $props();

  let visible = $state(false);
  let timeout: ReturnType<typeof setTimeout>;
  let tooltipEl: HTMLDivElement | undefined = $state();

  function show(): void {
    clearTimeout(timeout);
    timeout = setTimeout(() => (visible = true), 300);
  }

  function hide(): void {
    clearTimeout(timeout);
    visible = false;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
  class="relative inline-flex"
  onmouseenter={show}
  onmouseleave={hide}
  onfocus={show}
  onblur={hide}
>
  {@render children()}
  {#if visible}
    <div
      bind:this={tooltipEl}
      role="tooltip"
      class="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs text-background shadow-lg animate-fade-in"
    >
      {content}
      <!-- Arrow -->
      <div class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-foreground"></div>
    </div>
  {/if}
</span>