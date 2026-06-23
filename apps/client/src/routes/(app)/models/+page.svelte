<script lang="ts">
  import { modelsApi, providersApi } from '$lib/api';
  import { ApiError } from '$lib/api/error';
  import type { ModelView, Provider, ProviderKey } from '$lib/api/types';
  import Async from '$lib/components/Async.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import { formatCurrency } from '$lib/format';

  let fetchKeyId = $state('');
  let modelFilter = $state('');
  let notice = $state('');
  let error = $state('');
  let busy = $state(false);

  // Custom model form.
  let customProvider = $state('');
  let customModelId = $state('');
  let customName = $state('');
  let customInputCost = $state('0');
  let customOutputCost = $state('0');
  let customError = $state('');

  const load = (): Promise<[ModelView[], Provider[], ProviderKey[]]> =>
    Promise.all([modelsApi.list(), providersApi.list(), providersApi.listKeys()]);

  async function fetchModels(reload: () => void): Promise<void> {
    if (!fetchKeyId) {
      error = 'Choose a key to fetch models for.';
      return;
    }
    error = '';
    notice = '';
    busy = true;
    try {
      const result = await modelsApi.fetchForKey(Number(fetchKeyId));
      notice = `Fetched ${result.fetched} models (${result.free} free, enabled by default).`;
      reload();
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Failed to fetch models.';
    } finally {
      busy = false;
    }
  }

  async function toggle(model: ModelView, enabled: boolean, reload: () => void): Promise<void> {
    await modelsApi.update(model.userModelId, { enabled });
    reload();
  }

  async function addCustom(reload: () => void): Promise<void> {
    if (!customProvider || !customModelId.trim() || !customName.trim()) {
      customError = 'Provider, model id, and display name are required.';
      return;
    }
    customError = '';
    busy = true;
    try {
      await modelsApi.addCustom({
        providerKey: customProvider,
        modelId: customModelId.trim(),
        displayName: customName.trim(),
        inputCostPer1m: Number(customInputCost) || 0,
        outputCostPer1m: Number(customOutputCost) || 0,
      });
      customModelId = '';
      customName = '';
      reload();
    } catch (err) {
      customError = err instanceof ApiError ? err.message : 'Failed to add custom model.';
    } finally {
      busy = false;
    }
  }

  async function removeCustom(id: number, reload: () => void): Promise<void> {
    await modelsApi.removeCustom(id);
    reload();
  }
</script>

<PageHeader title="Models" description="Fetch a key's available models, enable the ones you want to route to, or add a custom model." />

<Async {load}>
  {#snippet children([models, providers, keys], reload)}
    {@const providerName = (id: number | null) =>
      id != null
        ? providers.find((p) => p.id === id)?.displayName ?? `Provider #${id}`
        : ''}
    {@const filteredModels = (modelFilter
      ? models.filter((m) => {
          const q = modelFilter.toLowerCase();
          return (
            m.displayName.toLowerCase().includes(q) ||
            m.modelId.toLowerCase().includes(q) ||
            providerName(m.providerId).toLowerCase().includes(q)
          );
        })
      : models
    ).toSorted((a, b) => (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1))}
    <div class="space-y-6">
      <Card title="Fetch free models">
        {#snippet children()}
          <div class="flex flex-wrap items-end gap-3">
            <div class="w-64">
              <Select
                label="Provider key"
                bind:value={fetchKeyId}
                options={keys.map((k) => ({
                  value: String(k.id),
                  label: `${providerName(k.providerId)} · ${k.label ?? `key ${k.id}`}`,
                }))}
              />
            </div>
            <Button disabled={busy} onclick={() => fetchModels(reload)}>
              {busy ? 'Fetching…' : 'Fetch models'}
            </Button>
          </div>
          {#if notice}
            <div class="mt-3 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {notice}
            </div>
          {/if}
          {#if error}
            <p class="mt-2 text-sm text-red-500">{error}</p>
          {/if}
        {/snippet}
      </Card>

      <Card title="Add a custom model">
        {#snippet children()}
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Provider"
              bind:value={customProvider}
              options={providers.map((p) => ({ value: p.key, label: p.displayName }))}
            />
            <TextField label="Model id" bind:value={customModelId} placeholder="my-model-v1" />
            <TextField label="Display name" bind:value={customName} placeholder="My Model" />
            <TextField label="Input $ / 1M" type="number" bind:value={customInputCost} />
            <TextField label="Output $ / 1M" type="number" bind:value={customOutputCost} />
            <div class="flex items-end">
              <Button full disabled={busy} onclick={() => addCustom(reload)}>Add custom model</Button>
            </div>
          </div>
          {#if customError}
            <p class="mt-2 text-sm text-red-500">{customError}</p>
          {/if}
        {/snippet}
      </Card>

      <div class="flex items-center gap-3">
        <div class="w-80">
          <TextField
            label="Search models"
            placeholder="Name, model id, or provider…"
            bind:value={modelFilter}
          />
        </div>
        {#if modelFilter}
          <span class="text-xs text-muted">
            {filteredModels.length} of {models.length} models match
          </span>
        {/if}
      </div>

      <div class="overflow-hidden rounded-xl border border-glass-border">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="bg-surface/50 text-muted">
              <th class="px-4 py-3 font-medium">Model</th>
              <th class="px-4 py-3 font-medium">Provider</th>
              <th class="px-4 py-3 font-medium">Cost (in/out)</th>
              <th class="px-4 py-3 font-medium">Tier</th>
              <th class="px-4 py-3 font-medium">Enabled</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {#each filteredModels as model (model.userModelId)}
              <tr class="border-t border-glass-border transition-colors hover:bg-background/20">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{model.displayName}</span>
                    <span class="text-xs text-muted font-mono">{model.modelId}</span>
                    {#if model.isFree}
                      <Badge tone="success">free</Badge>
                    {/if}
                    {#if model.isCustom}
                      <Badge tone="neutral">custom</Badge>
                    {/if}
                  </div>
                </td>
                <td class="px-4 py-3 text-muted">
                  {model.providerId ? providerName(model.providerId) : 'Custom'}
                </td>
                <td class="px-4 py-3 text-muted tabular-nums">
                  {formatCurrency(model.inputCostPer1m)} / {formatCurrency(model.outputCostPer1m)}
                </td>
                <td class="px-4 py-3">
                  <Badge tone="neutral">{model.speedTier}</Badge>
                </td>
                <td class="px-4 py-3">
                  <Toggle
                    checked={model.enabled}
                    label="Enable {model.displayName}"
                    onchange={(value) => toggle(model, value, reload)}
                  />
                </td>
                <td class="px-4 py-3 text-right">
                  {#if model.isCustom}
                    <Button variant="ghost" onclick={() => removeCustom(model.userModelId, reload)}>
                      Delete
                    </Button>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr>
                <td class="px-4 py-12 text-center text-muted" colspan="6">
                  No models yet — fetch a key's models above.
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/snippet}
</Async>
