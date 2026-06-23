<script lang="ts">
  import { analyticsApi } from '$lib/api';
  import Async from '$lib/components/Async.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import StatCard from '$lib/components/ui/StatCard.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { goto } from '$app/navigation';
  import { formatCurrency, formatMs, formatNumber, formatPercent } from '$lib/format';
  import type { ProviderUsageRow } from '$lib/api/types';
</script>

<PageHeader
  title="Dashboard"
  description="Your gateway usage and performance at a glance."
/>

<!-- Quick action cards -->
<div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <button
    type="button"
    onclick={() => goto('/playground')}
    class="glass group rounded-xl p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
  >
    <div class="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
      <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      </svg>
    </div>
    <p class="text-sm font-medium">Try Playground</p>
    <p class="text-xs text-muted">Test models in real time</p>
  </button>

  <button
    type="button"
    onclick={() => goto('/keys')}
    class="glass group rounded-xl p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
  >
    <div class="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
      <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    </div>
    <p class="text-sm font-medium">Manage Keys</p>
    <p class="text-xs text-muted">Add or rotate API keys</p>
  </button>

  <button
    type="button"
    onclick={() => goto('/strategies')}
    class="glass group rounded-xl p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
  >
    <div class="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
      <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    </div>
    <p class="text-sm font-medium">Routing Rules</p>
    <p class="text-xs text-muted">Configure fallback chains</p>
  </button>

  <button
    type="button"
    onclick={() => goto('/analytics')}
    class="glass group rounded-xl p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
  >
    <div class="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
      <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    </div>
    <p class="text-sm font-medium">View Analytics</p>
    <p class="text-xs text-muted">Detailed usage reports</p>
  </button>
</div>

<!-- Stats -->
<Async load={() => analyticsApi.summary('24h')} skeleton="card">
  {#snippet children(summary)}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Cost saved"
        value={formatCurrency(summary.totalCostSaved)}
        hint="vs. most expensive eligible model"
        accent
        trend={{ direction: summary.totalCostSaved > 0 ? 'up' : 'neutral', label: '24h' }}
      >
        {#snippet icon()}
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {/snippet}
      </StatCard>
      <StatCard label="Requests" value={formatNumber(summary.requests)}>
        {#snippet icon()}
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        {/snippet}
      </StatCard>
      <StatCard label="Success rate" value={formatPercent(summary.successRate)}>
        {#snippet icon()}
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {/snippet}
      </StatCard>
      <StatCard label="Avg latency" value={formatMs(summary.avgLatencyMs)}>
        {#snippet icon()}
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {/snippet}
      </StatCard>
    </div>

    <div class="mt-5 grid gap-4 lg:grid-cols-2">
      <!-- By-provider breakdown -->
      <Card title="By Provider">
        {#snippet children()}
          {#await analyticsApi.byProvider('24h')}
            <div class="space-y-3 py-2">
              {#each [1, 2, 3] as _}
                <Skeleton shape="text" class="h-8" />
              {/each}
            </div>
          {:then providers}
            {#if providers.length > 0}
              <div class="space-y-1.5">
                {#each providers as row (row.provider)}
                  <div class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-background/30">
                    <div class="flex-1">
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium">{row.provider ?? 'Unknown'}</span>
                        <span class="text-xs tabular-nums text-muted">
                          {formatNumber(row.requests)} req
                        </span>
                      </div>
                      <div class="mt-1 flex items-center gap-2">
                        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                          <div
                            class="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                            style="width: {providers.length > 0 ? (row.requests / Math.max(...providers.map((p) => p.requests)) * 100).toFixed(0) : 0}%"
                          ></div>
                        </div>
                        <span class="text-[11px] text-muted">{formatMs(row.avgLatencyMs)}</span>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="py-4 text-center text-sm text-muted">No provider data yet.</p>
            {/if}
          {:catch}
            <p class="py-4 text-center text-sm text-danger">Failed to load provider data.</p>
          {/await}
        {/snippet}
      </Card>

      <!-- Recent activity / summary -->
      <Card title="Overview">
        {#snippet children()}
          <div class="divide-y divide-glass-border py-1">
            <div class="flex items-center justify-between px-3 py-2.5">
              <span class="text-sm text-muted">Tokens routed</span>
              <span class="text-sm font-medium tabular-nums">{formatNumber(summary.totalTokens)}</span>
            </div>
            <div class="flex items-center justify-between px-3 py-2.5">
              <span class="text-sm text-muted">Time window</span>
              <Badge tone="neutral">{summary.window}</Badge>
            </div>
            <div class="flex items-center justify-between px-3 py-2.5">
              <span class="text-sm text-muted">Avg cost per request</span>
              <span class="text-sm font-medium tabular-nums">{summary.totalCostSaved > 0 && summary.requests > 0 ? formatCurrency(summary.totalCostSaved / summary.requests) : '$0.00'}</span>
            </div>
            <div class="flex items-center justify-between px-3 py-2.5">
              <span class="text-sm text-muted">Effective savings</span>
              <Badge tone={summary.totalCostSaved > 0 ? 'success' : 'neutral'}>
                {summary.totalCostSaved > 0 ? 'Active' : 'None'}
              </Badge>
            </div>
          </div>
        {/snippet}
      </Card>
    </div>
  {/snippet}
</Async>
