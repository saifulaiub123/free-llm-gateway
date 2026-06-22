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
  class="relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-50 {checked
    ? 'bg-primary'
    : 'bg-border'}"
>
  <span
    class="inline-block h-4 w-4 transform rounded-full bg-surface transition {checked
      ? 'translate-x-4'
      : 'translate-x-0.5'}"
  ></span>
</button>
