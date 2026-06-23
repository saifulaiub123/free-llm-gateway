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

  // ── Fetch-models form (unchanged) ──
  let fetchKeyId = $state('');
  let notice = $state('');
  let error = $state('');
  let busy = $state(false);

  // ── Custom model form (unchanged) ──
  let customProvider = $state('');
  let customModelId = $state('');
  let customName = $state('');
  let customInputCost = $state('0');
  let customOutputCost = $state('0');
  let customError = $state('');

  // ── Pagination + filter state (NEW) ──
  let items = $state<ModelView[]>([]);
  let page = $state(1);
  let perPage = $state(20);
  let total = $state(0);
  let loading = $state(false);
  let filter = $state<Record<string, unknown>>({});
  let sort = $state<string | undefined>(undefined);
  let providerFilter = $state('');
  let searchQuery = $state('');
  // Debounce timer for search input
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  let totalPages = $derived(Math.ceil(total / perPage) || 1);

  // Loads providers + keys only (no models — they load paginated)
  const loadMeta = (): Promise<[Provider[], ProviderKey[]]> =>
    Promise.all([providersApi.list(), providersApi.listKeys()]);

  /** Fetch the current page of models from the server. */
  async function loadModels(resetPage = false): Promise<void> {
    if (resetPage) page = 1;
    loading = true;
    try {
      const result = await modelsApi.query({
        page,
        per_page: perPage,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        sort,
      });
      items = result.items;
      page = result.page;
      perPage = result.perPage;
      total = result.total;
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Failed to load models.';
    } finally {
      loading = false;
    }
  }

  /** Merge a partial filter and reload from page 1. */
  function applyFilter(partial: Record<string, unknown>): void {
    // Remove keys with undefined/null values
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(partial)) {
      if (v !== undefined && v !== null && v !== '') {
        cleaned[k] = v;
      }
    }
    filter = { ...filter, ...cleaned };
    loadModels(true);
  }

  /** Reload the current page (used after toggle/fetch/add/delete). */
  async function reloadPage(): Promise<void> {
    await loadModels();
  }

  /** Handle search input with debounce (300ms). */
  function onSearchInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value || undefined;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      applyFilter({ displayName__like: value });
    }, 300);
  }

  // Initial load
  import { onMount } from 'svelte';

  onMount(() => {
    loadModels();
  });

  // ── Fetch models (unchanged logic, but reloads the page) ──
  async function fetchModels(): Promise<void> {
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
      await reloadPage();
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Failed to fetch models.';
    } finally {
      busy = false;
    }
  }

  async function toggle(model: ModelView, enabled: boolean): Promise<void> {
    await modelsApi.update(model.userModelId, { enabled });
    await reloadPage();
  }

  async function addCustom(): Promise<void> {
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
      await reloadPage();
    } catch (err) {
      customError = err instanceof ApiError ? err.message : 'Failed to add custom model.';
    } finally {
      busy = false;
    }
  }

  async function removeCustom(id: number): Promise<void> {
    await modelsApi.removeCustom(id);
    await reloadPage();
  }
</script>

<PageHeader title="Models" description="Fetch a key's available models, enable the ones you want to route to, or add a custom model." />

<Async load={loadMeta}>
  {#snippet children(data, _reloadMeta)}
    {@const providers = data[0] as Provider[]}
    {@const keys = data[1] as ProviderKey[]}
    {@const providerName = (id: number | null) =>
      id != null
        ? providers.find((p) => p.id === id)?.displayName ?? `Provider #${id}`
        : ''}
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
            <Button disabled={busy} onclick={fetchModels}>
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
              <Button full disabled={busy} onclick={addCustom}>Add custom model</Button>
            </div>
          </div>
          {#if customError}
            <p class="mt-2 text-sm text-red-500">{customError}</p>
          {/if}
        {/snippet}
      </Card>

      <!-- 🔁 Filter toolbar (NEW — server-side filtering) -->
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex items-center gap-2">
          <Toggle
            label="Enabled only"
            checked={filter.enabled === true}
            onchange={(v) => applyFilter({ enabled: v || undefined })}
          />
          <Toggle
            label="Free only"
            checked={filter.isFree === true}
            onchange={(v) => applyFilter({ isFree: v || undefined })}
          />
        </div>
        <div class="w-44">
          <Select
            label="Provider"
            bind:value={providerFilter}
            options={[
              { value: '', label: 'All providers' },
              ...providers.map((p) => ({ value: String(p.id), label: p.displayName })),
            ]}
            onchange={(v) => applyFilter({ providerId: v ? Number(v) : undefined })}
          />
        </div>
        <div class="w-60">
          <TextField
            label="Search name"
            placeholder="gpt, claude, …"
            bind:value={searchQuery}
            oninput={onSearchInput}
          />
        </div>
      </div>

      <!-- 🔁 Table — now reads from `items` instead of `filteredModels` -->
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
            {#each items as model (model.userModelId)}
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
                    onchange={(value) => toggle(model, value)}
                  />
                </td>
                <td class="px-4 py-3 text-right">
                  {#if model.isCustom}
                    <Button variant="ghost" onclick={() => removeCustom(model.userModelId)}>
                      Delete
                    </Button>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr>
                <td class="px-4 py-12 text-center text-muted" colspan="6">
                  {loading ? 'Loading…' : 'No models match your filters.'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- 🔁 Pagination controls (NEW) -->
      {#if totalPages > 1}
        <div class="flex items-center justify-center gap-4">
          <button
            type="button"
            class="rounded-lg border border-glass-border px-3 py-1.5 text-sm transition-colors hover:bg-surface/50 disabled:opacity-40"
            disabled={page <= 1 || loading}
            onclick={() => { page--; loadModels(); }}
          >
            ← Previous
          </button>
          <span class="text-sm text-muted">
            Page {page} of {totalPages}
            <span class="ml-1 tabular-nums">({total} models)</span>
          </span>
          <button
            type="button"
            class="rounded-lg border border-glass-border px-3 py-1.5 text-sm transition-colors hover:bg-surface/50 disabled:opacity-40"
            disabled={page >= totalPages || loading}
            onclick={() => { page++; loadModels(); }}
          >
            Next →
          </button>
        </div>
      {/if}

      {#if loading}
        <div class="flex items-center justify-center py-4 text-sm text-muted">
          Loading models…
        </div>
      {/if}
    </div>
  {/snippet}
</Async>
