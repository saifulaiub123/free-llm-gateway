<script lang="ts">
  interface Props {
    label: string;
    value: string;
  }

  let { label, value }: Props = $props();
</script>

<span class="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs">
  <span class="text-muted">{label}</span>
  <span class="font-medium">{value}</span>
</span>
