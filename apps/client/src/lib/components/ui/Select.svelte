<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    label?: string;
    value: string;
    options: Option[];
  }

  let { label, value = $bindable(), options }: Props = $props();
  const id = $derived(label ? `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);
</script>

<div class="space-y-1">
  {#if label}
    <label for={id} class="block text-sm font-medium">{label}</label>
  {/if}
  <select
    {id}
    bind:value
    class="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
  >
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>
