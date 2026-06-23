<script lang="ts">
  import { strategiesApi } from '$lib/api';
  import { ApiError } from '$lib/api/error';
  import type { ModelView, Provider, StrategyView } from '$lib/api/types';
  import { untrack } from 'svelte';
  import DragList from '$lib/components/DragList.svelte';
  import ModelOrderList from '$lib/components/ModelOrderList.svelte';
  import MetricBadge from '$lib/components/MetricBadge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import { formatCurrency } from '$lib/format';

  interface Props {
    /** The strategy being configured. This panel is keyed by `strategy.id` so its local editing
     * state initializes once from the saved config (no effect syncing props → state). */
    strategy: StrategyView;
    /** The user's enabled models, used as the orderable candidate set. */
    models: ModelView[];
    /** Catalog providers used to resolve provider names. */
    providers: Provider[];
    onsaved: () => void;
  }

  let { strategy, models, providers, onsaved }: Props = $props();

  type Weights = {
    cost: number;
    intelligence: number;
    speed: number;
    stability: number;
    rateLimit: number;
    availability: number;
  };

  const DEFAULT_WEIGHTS: Weights = {
    cost: 0.25,
    intelligence: 0.2,
    speed: 0.15,
    stability: 0.2,
    rateLimit: 0.1,
    availability: 0.1,
  };

  const MANUAL_MODES = ['fixed', 'stability', 'rate_limit', 'latency', 'cost'];
  const WEIGHT_KEYS: (keyof Weights)[] = [
    'cost',
    'intelligence',
    'speed',
    'stability',
    'rateLimit',
    'availability',
  ];

  let order = $state<ModelView[]>(untrack(() => [...models]));
  let weights = $state<Weights>(
    untrack(() => ({
      ...DEFAULT_WEIGHTS,
      ...((strategy.config.weights as Partial<Weights>) ?? {}),
    })),
  );
  let manualMode = $state(untrack(() => (strategy.config.manualMode as string) ?? 'fixed'));
  let filterText = $state('');
  let message = $state('');
  let error = $state('');
  let busy = $state(false);

  const providerById = $derived(
    providers.reduce(
      (map, p) => map.set(p.id, p),
      new Map<number, Provider>(),
    ),
  );

  const filteredOrder = $derived(
    filterText
      ? order.filter((model) => {
          const q = filterText.toLowerCase();
          const providerName = model.providerId != null
            ? (providerById.get(model.providerId)?.displayName ?? '')
            : '';
          return (
            model.displayName.toLowerCase().includes(q) ||
            providerName.toLowerCase().includes(q)
          );
        })
      : order,
  );

  async function run(action: () => Promise<unknown>, ok: string): Promise<void> {
    message = '';
    error = '';
    busy = true;
    try {
      await action();
      message = ok;
      onsaved();
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Save failed.';
    } finally {
      busy = false;
    }
  }

  const saveOrder = () =>
    run(
      () =>
        strategiesApi.reorder(
          strategy.id,
          order.map((model, index) => ({
            userModelId: model.userModelId,
            position: index,
            enabled: true,
          })),
        ),
      'Order saved.',
    );

  const saveManualMode = () =>
    run(() => strategiesApi.setConfig(strategy.id, { manualMode }), 'Manual mode saved.');

  const saveWeights = () =>
    run(() => strategiesApi.setConfig(strategy.id, { weights }), 'Weights saved.');

  /** Sorted models by their intelligence score (desc) as a hint of the automatic ordering. */
  const sortedByIntel = $derived([...models].sort((a, b) => b.intelligenceScore - a.intelligenceScore));
</script>

<div class="space-y-5">
  {#if strategy.type === 'manual'}
    <div class="flex flex-wrap items-end gap-3">
      <div class="w-56">
        <Select
          label="Manual sub-mode"
          bind:value={manualMode}
          options={MANUAL_MODES.map((mode) => ({ value: mode, label: mode.replace('_', ' ') }))}
        />
      </div>
      <Button variant="secondary" disabled={busy} onclick={saveManualMode}>Save sub-mode</Button>
    </div>

    {#if manualMode === 'fixed'}
      <div class="space-y-3">
        <p class="text-sm text-muted">Drag to set the fixed fallback order.</p>
        <TextField label="Filter models" placeholder="Name or provider…" bind:value={filterText} />
        <DragList
          items={filteredOrder}
          getId={(model) => model.userModelId}
          onreorder={(next) => (order = next)}
        >
          {#snippet row(model)}
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium">{model.displayName}</span>
              {#if model.providerId != null}
                <span class="text-xs text-muted">
                  ({providerById.get(model.providerId)?.displayName ?? 'Unknown'})
                </span>
              {/if}
              <MetricBadge label="intel" value={String(model.intelligenceScore)} />
              <MetricBadge label="tier" value={model.speedTier} />
              <MetricBadge label="in" value={formatCurrency(model.inputCostPer1m)} />
            </div>
          {/snippet}
        </DragList>
        <Button disabled={busy} onclick={saveOrder}>Save order</Button>
      </div>
    {:else}
      <!-- Non-fixed manual modes also need a visual model list -->
      <div>
        <p class="mb-2 text-xs font-semibold text-muted">Routing order</p>
        <ModelOrderList {models} {providerById} />
      </div>
    {/if}
  {:else if strategy.type === 'balanced'}
    <div class="space-y-3">
      <p class="text-sm text-muted">Blend weights (higher = more influence on the score).</p>
      <div class="grid gap-3 sm:grid-cols-2">
        {#each WEIGHT_KEYS as key (key)}
          <label class="flex items-center gap-3 text-sm">
            <span class="w-24 capitalize">{key}</span>
            <input type="range" min="0" max="1" step="0.05" bind:value={weights[key]} class="flex-1" />
            <span class="w-10 text-right text-muted">{weights[key].toFixed(2)}</span>
          </label>
        {/each}
      </div>
      <Button disabled={busy} onclick={saveWeights}>Save weights</Button>
    </div>

    <!-- Show model list sorted by intelligence (approximating weighted score) -->
    <div>
      <p class="mb-2 text-xs font-semibold text-muted">Routing order (approx. by intelligence score)</p>
      <ModelOrderList models={sortedByIntel} {providerById} />
    </div>
  {:else if strategy.type === 'free_first'}
    <div>
      <p class="mb-2 text-xs font-semibold text-muted">Routing order (free models first, then cheapest)</p>
      <ModelOrderList
        models={[...models].sort((a, b) => Number(a.isFree) < Number(b.isFree) ? 1 : Number(a.isFree) > Number(b.isFree) ? -1 : a.inputCostPer1m - b.inputCostPer1m)}
        {providerById}
      />
    </div>
  {:else if strategy.type === 'fastest'}
    <div>
      <p class="mb-2 text-xs font-semibold text-muted">Routing order (fastest tier first)</p>
      <ModelOrderList
        models={[...models].sort((a, b) => a.speedTier.localeCompare(b.speedTier))}
        {providerById}
      />
    </div>
  {:else if strategy.type === 'smart'}
    <div>
      <p class="mb-2 text-xs font-semibold text-muted">Routing order (highest intelligence first)</p>
      <ModelOrderList
        models={sortedByIntel}
        {providerById}
      />
    </div>
  {/if}

  {#if message}
    <p class="text-sm text-green-500">{message}</p>
  {/if}
  {#if error}
    <p class="text-sm text-red-500">{error}</p>
  {/if}
</div>
