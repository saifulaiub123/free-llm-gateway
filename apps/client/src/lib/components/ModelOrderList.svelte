<script lang="ts">
  import type { ModelView, Provider } from '$lib/api/types';
  import MetricBadge from '$lib/components/MetricBadge.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { formatCurrency } from '$lib/format';

  interface Props {
    models: ModelView[];
    providerById: Map<number, Provider>;
  }

  let { models, providerById }: Props = $props();
</script>

<div class="overflow-hidden rounded-lg border border-glass-border">
  <table class="w-full text-left text-xs">
    <thead>
      <tr class="bg-surface/60 text-muted">
        <th class="w-8 px-2 py-1.5 text-center font-medium">#</th>
        <th class="px-2 py-1.5 font-medium">Model</th>
        <th class="px-2 py-1.5 font-medium">Provider</th>
        <th class="px-2 py-1.5 font-medium">Metrics</th>
      </tr>
    </thead>
    <tbody>
      {#each models as model, index (model.userModelId)}
        <tr class="border-t border-glass-border transition-colors hover:bg-surface/30">
          <td class="px-2 py-1.5 text-center text-muted tabular-nums">{index + 1}</td>
          <td class="px-2 py-1.5">
            <div class="flex items-center gap-1.5">
              <span class="font-medium text-foreground">{model.displayName}</span>
              {#if model.isFree}
                <Badge tone="success" dot />
              {/if}
            </div>
          </td>
          <td class="px-2 py-1.5 text-muted">
            {model.providerKeyLabel ?? (model.providerId != null ? (providerById.get(model.providerId)?.displayName ?? '—') : 'Custom')}
          </td>
          <td class="px-2 py-1.5">
            <div class="flex flex-wrap gap-1">
              <MetricBadge label="intel" value={String(model.intelligenceScore)} />
              <MetricBadge label="tier" value={model.speedTier} />
              <MetricBadge label="cost" value={formatCurrency(model.inputCostPer1m)} />
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
