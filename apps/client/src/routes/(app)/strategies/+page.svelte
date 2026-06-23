<script lang="ts">
  import { modelsApi, providersApi, strategiesApi } from '$lib/api';
  import { ApiError } from '$lib/api/error';
  import type { ModelView, Provider, StrategyType, StrategyView } from '$lib/api/types';
  import Async from '$lib/components/Async.svelte';
  import StrategyConfigPanel from '$lib/components/StrategyConfigPanel.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';

  const TYPES: StrategyType[] = ['balanced', 'free_first', 'fastest', 'smart', 'manual'];

  let selectedId = $state<number | null>(null);
  let newType = $state<StrategyType>('balanced');
  let newName = $state('');
  let error = $state('');
  let busy = $state(false);
  let showCreateForm = $state(false);

  // 🔁 No modelsApi.list() — load only strategies + providers
  const load = (): Promise<[StrategyView[], Provider[]]> =>
    Promise.all([strategiesApi.list(), providersApi.list()]);

  // 🔁 Script-level tracking of Async data so $effect can react to it
  let allStrategies = $state<StrategyView[]>([]);
  let allProviders = $state<Provider[]>([]);

  // 🔁 Per-strategy model cache — loaded via $effect, not from template
  let modelCache = $state<Map<number, ModelView[]>>(new Map());
  let selectedModels = $state<ModelView[]>([]);
  let modelsLoading = $state(false);

  // When the selected strategy changes, load models from cache or API.
  // WHY $effect instead of {#await}: Svelte 5 forbids mutating $state inside
  // template expressions (state_unsafe_mutation).
  $effect(() => {
    const id = selectedId;
    const strategies = allStrategies;
    if (!strategies.length || id === null) return;

    // Resolve strategy to verify it exists
    const strategy = resolveSelected(strategies);
    if (!strategy) return;

    const cached = modelCache.get(id);
    if (cached) {
      selectedModels = cached;
      return;
    }

    // Defer the async load so state mutations don't run during effect evaluation
    queueMicrotask(async () => {
      modelsLoading = true;
      try {
        const page = await modelsApi.query({
          filter: { enabled: true },
          per_page: 200,
        });
        modelCache = new Map(modelCache).set(id, page.items);
        selectedModels = page.items;
      } finally {
        modelsLoading = false;
      }
    });
  });

  function resolveSelected(strategies: StrategyView[]): StrategyView | undefined {
    return (
      strategies.find((s) => s.id === selectedId) ??
      strategies.find((s) => s.isDefault) ??
      strategies[0]
    );
  }

  /** Get a short human-readable description of the strategy's type. */
  function typeDesc(type: StrategyType): string {
    const map: Record<StrategyType, string> = {
      manual: 'Drag order',
      free_first: 'Free first',
      balanced: 'Weighted score',
      fastest: 'Fastest',
      smart: 'Smart',
    };
    return map[type];
  }

  /** Get the strategy type's icon (emoji as inline SVG alternative — use a simple label). */
  function typeIcon(type: StrategyType): string {
    const map: Record<StrategyType, string> = {
      manual: '⇅',
      free_first: '🆓',
      balanced: '⚖',
      fastest: '⚡',
      smart: '🧠',
    };
    return map[type];
  }

  async function create(reload: () => void): Promise<void> {
    if (!newName.trim()) {
      error = 'Name is required.';
      return;
    }
    error = '';
    busy = true;
    try {
      const created = await strategiesApi.create(newType, newName.trim());
      newName = '';
      selectedId = created.id;
      showCreateForm = false;
      reload();
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Failed to create strategy.';
    } finally {
      busy = false;
    }
  }

  async function makeDefault(id: number, reload: () => void): Promise<void> {
    await strategiesApi.setDefault(id);
    reload();
  }
</script>

<PageHeader title="Routing strategies" description="Pick how the gateway orders fallback candidates. The default strategy is used when a request sends no override header." />

<Async {load}>
  {#snippet children(data, reload)}
    {@const strategies = data[0] as StrategyView[]}
    {@const providers = data[1] as Provider[]}
    <!-- Sync script-level state so $effect can react to strategy changes -->
    {#if allStrategies !== strategies}
      {(() => {
        allStrategies = strategies;
        allProviders = providers;
        return '';
      })()}
    {/if}
    {@const selected = resolveSelected(strategies)}
    <div class="flex gap-6">
      <!-- Left sidebar: ultra-compact strategy list -->
      <div class="w-60 shrink-0 space-y-3">
        {#if showCreateForm}
          <div class="rounded-lg border border-glass-border bg-surface/50 p-3">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-xs font-semibold">New strategy</span>
              <button type="button" aria-label="Close" class="text-muted hover:text-foreground" onclick={() => { showCreateForm = false; error = ''; }}>
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="space-y-2">
              <Select
                label="Type"
                bind:value={newType}
                options={TYPES.map((type) => ({ value: type, label: type.replace('_', ' ') }))}
              />
              <TextField label="Name" bind:value={newName} placeholder="My router" />
              {#if error}
                <p class="text-xs text-red-500">{error}</p>
              {/if}
              <div class="flex gap-2">
                <Button size="sm" disabled={busy} onclick={() => create(reload)}>Create</Button>
                <Button size="sm" variant="ghost" onclick={() => { showCreateForm = false; error = ''; }}>Cancel</Button>
              </div>
            </div>
          </div>
        {:else}
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-lg border border-dashed border-glass-border px-3 py-2 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
            onclick={() => showCreateForm = true}
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Create strategy
          </button>
        {/if}

        <div class="space-y-1">
          {#each strategies as strategy (strategy.id)}
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all {selected?.id === strategy.id
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-transparent text-muted hover:border-glass-border hover:bg-surface/50 hover:text-foreground'}"
              onclick={() => (selectedId = strategy.id)}
            >
              <span class="shrink-0 text-xs leading-none">{typeIcon(strategy.type)}</span>
              <span class="flex-1 truncate font-medium">{strategy.name}</span>
              {#if strategy.isDefault}
                <Badge tone="success" dot />
              {/if}
              <span class="shrink-0 tabular-nums text-muted">enabled</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Right: config panel with per-click model loading -->
      <div class="min-w-0 flex-1">
        {#if selected}
          <Card>
            <div class="mb-4 flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold">{selected.name}</h2>
                <p class="text-xs text-muted">{typeDesc(selected.type)}</p>
              </div>
              {#if !selected.isDefault}
                <Button variant="ghost" size="sm" onclick={() => makeDefault(selected.id, reload)}>
                  Set as default
                </Button>
              {:else}
                <Badge tone="success">default</Badge>
              {/if}
            </div>
            {#key selected.id}
              {#if modelsLoading}
                <div class="flex h-40 items-center justify-center text-sm text-muted">
                  Loading models…
                </div>
              {:else}
                <StrategyConfigPanel strategy={selected} models={selectedModels} {providers} onsaved={reload} />
              {/if}
            {/key}
          </Card>
        {:else}
          <div class="flex h-40 items-center justify-center rounded-xl border border-dashed border-glass-border text-sm text-muted">
            Create a strategy to configure routing.
          </div>
        {/if}
      </div>
    </div>
  {/snippet}
</Async>
