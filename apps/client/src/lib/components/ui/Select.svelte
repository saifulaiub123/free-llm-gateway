<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    label?: string;
    value: string;
    options: Option[];
    /** Optional callback fired with the newly selected value (for one-way / side-effecting selects). */
    onchange?: (value: string) => void;
    placeholder?: string;
  }

  let { label, value = $bindable(), options, onchange, placeholder }: Props = $props();
  const id = $derived(label ? `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);
</script>

<div class="space-y-1">
  {#if label}
    <label for={id} class="block text-sm font-medium">{label}</label>
  {/if}
  <div class="relative">
    <select
      {id}
      bind:value
      onchange={(event) => onchange?.(event.currentTarget.value)}
      class="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-8 text-sm font-sans text-foreground outline-none transition-all duration-150 focus:border-primary focus:shadow-[0_0_0_3px] focus:shadow-primary/20 {value
        ? ''
        : 'text-muted/60'}"
    >
      {#if placeholder}
        <option value="" disabled style="color: var(--theme-muted)">{placeholder}</option>
      {/if}
      {#each options as option (option.value)}
        <option value={option.value} style="color: var(--theme-foreground); background: var(--theme-background)">{option.label}</option>
      {/each}
    </select>
    <!-- Custom chevron -->
    <svg
      class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  </div>
</div>
