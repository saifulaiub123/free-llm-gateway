<script lang="ts">
  interface Props {
    class?: string;
    showText?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }

  let { class: klass = '', showText = true, size = 'md' }: Props = $props();

  const iconSizes: Record<string, string> = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const textSizes: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };
</script>

<a href="/dashboard" class="inline-flex items-center gap-2 {klass}">
  <!-- Gateway icon: simplified lightning bolt in rounded hexagon -->
  <div
    class="flex {iconSizes[size]} items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent p-1.5 shadow-sm"
  >
    <svg class="h-full w-full text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke-linejoin="round" />
    </svg>
  </div>
  {#if showText}
    <span class="font-bold tracking-tight {textSizes[size]}">
      <span class="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Free LLM Gateway
      </span>
    </span>
  {/if}
</a>