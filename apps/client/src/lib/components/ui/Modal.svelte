<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
    title?: string;
    description?: string;
    /** Footer slot for action buttons */
    footer?: Snippet;
    children: Snippet;
  }

  let { open, onclose, title, description, footer, children }: Props = $props();

  function handleBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) onclose();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay p-4 animate-fade-in"
    onclick={handleBackdrop}
    onkeydown={(e) => e.key === 'Escape' && onclose()}
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <!-- Dialog -->
    <div
      class="glass-raised w-full max-w-lg animate-fade-in-up rounded-xl"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="presentation"
    >
      {#if title}
        <div class="flex items-center justify-between border-b border-glass-border px-5 py-4">
          <div>
            <h2 class="text-lg font-semibold">{title}</h2>
            {#if description}
              <p class="mt-0.5 text-sm text-muted">{description}</p>
            {/if}
          </div>
          <button
            type="button"
            onclick={onclose}
            class="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/if}
      <div class="px-5 py-4">
        {@render children()}
      </div>
      {#if footer}
        <div class="flex items-center justify-end gap-2 border-t border-glass-border px-5 py-3">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}