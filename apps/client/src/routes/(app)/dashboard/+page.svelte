<script lang="ts">
  import { analyticsApi } from '$lib/api';
  import Async from '$lib/components/Async.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import StatCard from '$lib/components/ui/StatCard.svelte';
  import { formatCurrency, formatMs, formatNumber, formatPercent } from '$lib/format';
</script>

<PageHeader title="Dashboard" description="Your gateway usage over the last 24 hours." />

<Async load={() => analyticsApi.summary('24h')}>
  {#snippet children(summary)}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Cost saved"
        value={formatCurrency(summary.totalCostSaved)}
        hint="vs. the most expensive eligible model"
        accent
      />
      <StatCard label="Requests" value={formatNumber(summary.requests)} />
      <StatCard label="Success rate" value={formatPercent(summary.successRate)} />
      <StatCard label="Avg latency" value={formatMs(summary.avgLatencyMs)} />
    </div>
    <p class="mt-4 text-sm text-muted">
      {formatNumber(summary.totalTokens)} tokens routed in this window.
    </p>
  {/snippet}
</Async>
