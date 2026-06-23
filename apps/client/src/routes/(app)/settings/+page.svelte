<script lang="ts">
  import { themeStore } from '$lib/stores/theme.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';

  let theme = $state(themeStore.current);

  $effect(() => {
    themeStore.set(theme as 'light' | 'dark');
  });
</script>

<PageHeader title="Settings" description="Personal preferences for the dashboard." />

<div class="grid gap-6 sm:max-w-lg">
  <!-- Appearance -->
  <Card title="Appearance" variant="raised">
    {#snippet children()}
      <p class="mb-4 text-sm text-muted">Choose your preferred color scheme for the dashboard.</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onclick={() => (theme = 'light')}
          class="group rounded-xl border-2 p-4 text-left transition-all duration-150 {theme === 'light' ? 'border-primary bg-primary/5 shadow-sm' : 'border-glass-border hover:border-muted/30'}"
        >
          <div class="mb-3 h-20 rounded-lg border border-glass-border bg-white shadow-sm">
            <div class="flex h-full items-end p-2">
              <div class="h-2 w-1/2 rounded bg-gray-200"></div>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Light</span>
            {#if theme === 'light'}
              <svg class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            {/if}
          </div>
        </button>

        <button
          type="button"
          onclick={() => (theme = 'dark')}
          class="group rounded-xl border-2 p-4 text-left transition-all duration-150 {theme === 'dark' ? 'border-primary bg-primary/5 shadow-sm' : 'border-glass-border hover:border-muted/30'}"
        >
          <div class="mb-3 h-20 rounded-lg border border-glass-border bg-gray-900 shadow-sm">
            <div class="flex h-full items-end p-2">
              <div class="h-2 w-1/2 rounded bg-gray-600"></div>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Dark</span>
            {#if theme === 'dark'}
              <svg class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            {/if}
          </div>
        </button>
      </div>
    {/snippet}
  </Card>

  <!-- Routing defaults -->
  <Card title="Routing Defaults" variant="raised">
    {#snippet children()}
      <p class="text-sm text-muted leading-relaxed">
        Metric windows, default weights, and the key health-probe interval are configured per strategy on
        the <a class="font-medium text-primary hover:underline" href="/strategies">Strategies</a> page.
        Account-wide defaults are coming in a future release.
      </p>
      <div class="mt-4 flex items-center gap-2 rounded-lg bg-background px-3 py-2">
        <Badge tone="neutral" dot>Coming soon</Badge>
        <span class="text-xs text-muted">Global rate limits and cooldown presets</span>
      </div>
    {/snippet}
  </Card>

  <!-- Account info -->
  <Card title="Account" variant="raised">
    {#snippet children()}
      <p class="text-sm text-muted">
        Account management, password changes, and notification preferences are available in a
        forthcoming update.
      </p>
    {/snippet}
  </Card>
</div>
