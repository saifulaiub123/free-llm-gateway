<script lang="ts">
  interface Props {
    label: string;
    value: string;
    hint?: string;
    accent?: boolean;
  }

  let { label, value, hint, accent = false }: Props = $props();
</script>

<div class="rounded-lg border border-border bg-surface p-4">
  <p class="text-sm text-muted">{label}</p>
  <p class="mt-1 text-2xl font-semibold {accent ? 'text-primary' : ''}">{value}</p>
  {#if hint}
    <p class="mt-1 text-xs text-muted">{hint}</p>
  {/if}
</div>
