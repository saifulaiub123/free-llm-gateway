<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props {
    label: string;
    value: string;
    type?: HTMLInputAttributes['type'];
    placeholder?: string;
    error?: string;
    required?: boolean;
    autocomplete?: HTMLInputAttributes['autocomplete'];
  }

  let {
    label,
    value = $bindable(),
    type = 'text',
    placeholder,
    error,
    required = false,
    autocomplete,
  }: Props = $props();

  const id = $derived(`field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
</script>

<div class="space-y-1">
  <label for={id} class="block text-sm font-medium">{label}</label>
  <input
    {id}
    {type}
    {placeholder}
    {required}
    {autocomplete}
    bind:value
    class="w-full rounded-lg border bg-surface px-3 py-2 text-sm font-sans outline-none transition-all duration-150 placeholder:text-muted/60 focus:border-primary focus:shadow-[0_0_0_3px] focus:shadow-primary/20 {error
      ? 'border-red-500 focus:shadow-red-500/20'
      : 'border-border'}"
  />
  {#if error}
    <p class="mt-0.5 text-xs text-red-500">{error}</p>
  {/if}
</div>
