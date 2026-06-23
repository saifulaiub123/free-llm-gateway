<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    /** Optional Snippet rendered as an icon/illustration above the title */
    icon?: Snippet;
    /** Optional action slot (e.g., a button) */
    action?: Snippet;
    class?: string;
  }

  let { title, description, icon, action, class: klass = '' }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-16 text-center {klass}">
  {#if icon}
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary">
      {@render icon()}
    </div>
  {:else}
    <!-- Default empty state icon -->
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-muted">
      <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke-linejoin="round" />
      </svg>
    </div>
  {/if}
  <h3 class="text-lg font-semibold">{title}</h3>
  {#if description}
    <p class="mt-1 max-w-sm text-sm text-muted">{description}</p>
  {/if}
  {#if action}
    <div class="mt-4">
      {@render action()}
    </div>
  {/if}
</div>