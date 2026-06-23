<script lang="ts">
  import { analyticsApi } from '$lib/api';
  import type { ProviderUsageRow, UsageSummary } from '$lib/api/types';
  import Async from '$lib/components/Async.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import StatCard from '$lib/components/ui/StatCard.svelte';
  import { formatCurrency, formatMs, formatNumber, formatPercent } from '$lib/format';

  let window = $state('24h');

  const load = (): Promise<[UsageSummary, ProviderUsageRow[]]> =>
    Promise.all([analyticsApi.summary(window), analyticsApi.byProvider(window)]);
</script>

<PageHeader title="Analytics" description="Usage and savings across your routing windows.">
  {#snippet actions()}
    <div class="w-32">
      <Select
        bind:value={window}
        options={[
          { value: '24h', label: 'Last 24h' },
          { value: '7d', label: 'Last 7 days' },
          { value: '30d', label: 'Last 30 days' },
        ]}
      />
    </div>
  {/snippet}
</PageHeader>

<Async {load}>
  {#snippet children([summary, providers])}
    {@const maxRequests = Math.max(1, ...providers.map((p) => p.requests))}
    <div class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cost saved" value={formatCurrency(summary.totalCostSaved)} accent />
        <StatCard label="Requests" value={formatNumber(summary.requests)} />
        <StatCard label="Success rate" value={formatPercent(summary.successRate)} />
        <StatCard label="Avg latency" value={formatMs(summary.avgLatencyMs)} />
      </div>

      <div>
        <h2 class="mb-3 text-sm font-semibold">By provider</h2>
        {#if providers.length === 0}
          <p class="text-sm text-muted">No requests in this window yet.</p>
        {:else}
          <div class="space-y-3">
            {#each providers as row (row.provider ?? 'unrouted')}
              <div class="rounded-lg border border-border bg-surface p-3">
                <div class="mb-2 flex items-center justify-between text-sm">
                  <span class="font-medium">{row.provider ?? 'Unrouted'}</span>
                  <span class="text-muted">
                    {formatNumber(row.requests)} req · {formatCurrency(row.totalCostSaved)} saved · {formatMs(
                      row.avgLatencyMs,
                    )}
                  </span>
                </div>
                <div class="h-2 overflow-hidden rounded bg-background">
                  <div
                    class="h-full bg-primary"
                    style="width: {(row.requests / maxRequests) * 100}%"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/snippet}
</Async>
