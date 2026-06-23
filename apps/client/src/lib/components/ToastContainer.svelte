<script lang="ts">
  import { toast, type ToastEntry } from '$lib/stores/toast.svelte';

  const icons: Record<string, string> = {
    success:
      'M9 12l2 2 4-4 m7 1h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z',
    error:
      'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    warning:
      'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
    info:
      'M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20 10 10 0 010-20z',
  };

  const toneStyles: Record<string, string> = {
    success: 'border-green-500/20 bg-green-500/10 text-green-500',
    error: 'border-red-500/20 bg-red-500/10 text-red-500',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
    info: 'border-primary/20 bg-primary/10 text-primary',
  };
</script>

{#if toast.toasts.length > 0}
  <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
    {#each toast.toasts as entry (entry.id)}
      <div
        class="animate-fade-in-up glass-raised flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg {toneStyles[entry.type]}"
        role="alert"
      >
        <svg
          class="mt-0.5 h-5 w-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path d={icons[entry.type]} stroke-linejoin="round" />
        </svg>
        <p class="flex-1 text-sm font-medium">{entry.message}</p>
        <button
          type="button"
          onclick={() => toast.dismiss(entry.id)}
          class="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    {/each}
  </div>
{/if}