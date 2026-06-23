<script lang="ts">
  import { providersApi } from '$lib/api';
  import { ApiError } from '$lib/api/error';
  import type { Provider, ProviderKey } from '$lib/api/types';
  import Async from '$lib/components/Async.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import { formatDate } from '$lib/format';
  import { keyStatusLabel, keyStatusTone } from '$lib/status';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  let providerKey = $state('');
  let apiKey = $state('');
  let label = $state('');
  let error = $state('');
  let busy = $state(false);

  const load = (): Promise<[Provider[], ProviderKey[]]> =>
    Promise.all([providersApi.list(), providersApi.listKeys()]);

  async function addKey(reload: () => void): Promise<void> {
    if (!providerKey || !apiKey.trim()) {
      error = 'Choose a provider and enter an API key.';
      return;
    }
    error = '';
    busy = true;
    try {
      await providersApi.addKey(providerKey, apiKey.trim(), label.trim() || undefined);
      apiKey = '';
      label = '';
      reload();
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Failed to add key.';
    } finally {
      busy = false;
    }
  }

  async function removeKey(id: number, reload: () => void): Promise<void> {
    await providersApi.removeKey(id);
    reload();
  }
</script>

<PageHeader title="Provider keys" description="Add one or more API keys per provider; the pool is load-balanced and health-checked." />

<Async {load}>
  {#snippet children([providers, keys], reload)}
    {@const nameOf = (id: number) =>
      providers.find((p) => p.id === id)?.displayName ?? `Provider #${id}`}
    <div class="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <Card title="Add a key">
        {#snippet children()}
          <div class="space-y-3">
            <Select
              label="Provider"
              bind:value={providerKey}
              options={providers.map((p) => ({ value: p.key, label: p.displayName }))}
            />
            <TextField label="API key" type="password" bind:value={apiKey} placeholder="sk-…" />
            <TextField label="Label (optional)" bind:value={label} placeholder="prod-key-1" />
            {#if error}
              <div class="flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
                <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            {/if}
            <Button full disabled={busy} onclick={() => addKey(reload)}>
              {busy ? 'Validating…' : 'Add key'}
            </Button>
          </div>
        {/snippet}
      </Card>

      <div class="space-y-2">
        {#if keys.length === 0}
          <div class="py-8">
            <EmptyState title="No keys yet" description="Add a provider key above to start routing requests." />
          </div>
        {:else}
          {#each keys as key (key.id)}
            <Card class="!flex-row items-center justify-between" variant="raised">
              <div>
                <p class="font-medium">{nameOf(key.providerId)}</p>
                <p class="text-xs text-muted">
                  {key.label ?? 'Unlabelled'} · checked {formatDate(key.lastCheckedAt)}
                </p>
              </div>
              <div class="flex items-center gap-3">
                <Badge tone={keyStatusTone(key.status)} dot>{keyStatusLabel(key.status)}</Badge>
                <Button variant="danger" onclick={() => removeKey(key.id, reload)}>Remove</Button>
              </div>
            </Card>
          {/each}
        {/if}
      </div>
    </div>
  {/snippet}
</Async>
