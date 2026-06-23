<script lang="ts">
  interface Props {
    checked: boolean;
    label?: string;
    disabled?: boolean;
    onchange: (checked: boolean) => void;
  }

  let { checked, label, disabled = false, onchange }: Props = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  {disabled}
  onclick={() => onchange(!checked)}
  class="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 {checked
    ? 'bg-primary'
    : 'bg-border'}"
>
  <span
    class="inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 {checked
      ? 'translate-x-5.5'
      : 'translate-x-0.5'}"
  ></span>
</button>
