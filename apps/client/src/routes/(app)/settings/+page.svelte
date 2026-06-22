<script lang="ts">
  import { themeStore } from '$lib/stores/theme.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Select from '$lib/components/ui/Select.svelte';

  let theme = $state(themeStore.current);

  // Apply the theme as soon as the selection changes (the store persists it to localStorage).
  $effect(() => {
    themeStore.set(theme as 'light' | 'dark');
  });
</script>

<PageHeader title="Settings" description="Personal preferences for the dashboard." />

<div class="grid gap-4 sm:max-w-md">
  <Card>
    <h2 class="mb-3 text-sm font-semibold">Appearance</h2>
    <Select
      label="Theme"
      bind:value={theme}
      options={[
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ]}
    />
  </Card>

  <Card>
    <h2 class="mb-1 text-sm font-semibold">Routing defaults</h2>
    <p class="text-sm text-muted">
      Metric windows, default weights, and the key health-probe interval are configured per strategy on
      the <a class="text-primary hover:underline" href="/strategies">Strategies</a> page; account-wide settings
      arrive in a later release.
    </p>
  </Card>
</div>
