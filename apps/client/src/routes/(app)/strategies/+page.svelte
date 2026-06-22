<script lang="ts">
  import { modelsApi, strategiesApi } from '$lib/api';
  import { ApiError } from '$lib/api/error';
  import type { ModelView, StrategyType, StrategyView } from '$lib/api/types';
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

  const load = (): Promise<[StrategyView[], ModelView[]]> =>
    Promise.all([strategiesApi.list(), modelsApi.list()]);

  function resolveSelected(strategies: StrategyView[]): StrategyView | undefined {
    return (
      strategies.find((s) => s.id === selectedId) ??
      strategies.find((s) => s.isDefault) ??
      strategies[0]
    );
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
  {#snippet children([strategies, models], reload)}
    {@const selected = resolveSelected(strategies)}
    {@const enabledModels = models.filter((m) => m.enabled)}
    <div class="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div class="space-y-4">
        <Card>
          <h2 class="mb-3 text-sm font-semibold">Create strategy</h2>
          <div class="space-y-3">
            <Select
              label="Type"
              bind:value={newType}
              options={TYPES.map((type) => ({ value: type, label: type.replace('_', ' ') }))}
            />
            <TextField label="Name" bind:value={newName} placeholder="My balanced router" />
            {#if error}
              <p class="text-sm text-red-500">{error}</p>
            {/if}
            <Button full disabled={busy} onclick={() => create(reload)}>Create</Button>
          </div>
        </Card>

        <div class="space-y-2">
          {#each strategies as strategy (strategy.id)}
            <Card class="cursor-pointer {selected?.id === strategy.id ? 'border-primary' : ''}">
              <button type="button" class="w-full text-left" onclick={() => (selectedId = strategy.id)}>
                <div class="flex items-center justify-between">
                  <span class="font-medium">{strategy.name}</span>
                  {#if strategy.isDefault}
                    <Badge tone="success">default</Badge>
                  {/if}
                </div>
                <span class="text-xs text-muted">{strategy.type.replace('_', ' ')}</span>
              </button>
              {#if !strategy.isDefault}
                <div class="mt-2">
                  <Button variant="ghost" onclick={() => makeDefault(strategy.id, reload)}>
                    Set as default
                  </Button>
                </div>
              {/if}
            </Card>
          {/each}
        </div>
      </div>

      <Card>
        {#if selected}
          <h2 class="mb-1 text-lg font-semibold">{selected.name}</h2>
          <p class="mb-4 text-xs text-muted">{selected.type.replace('_', ' ')} strategy</p>
          {#key selected.id}
            <StrategyConfigPanel strategy={selected} models={enabledModels} onsaved={reload} />
          {/key}
        {:else}
          <p class="text-sm text-muted">Create a strategy to configure routing.</p>
        {/if}
      </Card>
    </div>
  {/snippet}
</Async>
