<script lang="ts">
  import { tokensApi } from '$lib/api';
  import { ApiError } from '$lib/api/error';
  import type { ApiTokenMetadata } from '$lib/api/types';
  import Async from '$lib/components/Async.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import { formatDate } from '$lib/format';

  let name = $state('');
  let error = $state('');
  let busy = $state(false);
  let plaintext = $state<string | null>(null);
  let copied = $state(false);

  async function create(reload: () => void): Promise<void> {
    if (!name.trim()) {
      error = 'Name is required.';
      return;
    }
    error = '';
    busy = true;
    try {
      const created = await tokensApi.create(name.trim());
      plaintext = created.token;
      copied = false;
      name = '';
      reload();
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Failed to create token.';
    } finally {
      busy = false;
    }
  }

  async function copy(): Promise<void> {
    if (!plaintext) return;
    await navigator.clipboard.writeText(plaintext);
    copied = true;
  }

  async function revoke(id: number, reload: () => void): Promise<void> {
    await tokensApi.revoke(id);
    reload();
  }
</script>

<PageHeader title="API Tokens" description="Tokens authenticate external clients against the /v1 gateway. The secret is shown only once." />

<Async load={() => tokensApi.list()}>
  {#snippet children(tokens: ApiTokenMetadata[], reload)}
    <div class="space-y-6">
      <!-- Create token -->
      <Card title="Create a token">
        {#snippet children()}
          <div class="flex flex-wrap items-end gap-3">
            <div class="w-64">
              <TextField label="Name" bind:value={name} placeholder="scraperq-prod" />
            </div>
            <Button disabled={busy} onclick={() => create(reload)}>Create token</Button>
          </div>
          {#if error}
            <p class="mt-2 text-sm text-red-500">{error}</p>
          {/if}
          {#if plaintext}
            <div class="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/8 p-4">
              <p class="flex items-center gap-1.5 text-xs font-medium text-amber-500">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Copy this token now — it will not be shown again.
              </p>
              <div class="mt-2 flex items-center gap-2">
                <code class="min-w-0 flex-1 truncate rounded-lg bg-background px-3 py-2 text-sm font-mono">
                  {plaintext}
                </code>
                <Button variant="secondary" onclick={copy}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          {/if}
        {/snippet}
      </Card>

      <!-- Token table -->
      <div class="overflow-hidden rounded-xl border border-glass-border">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="bg-surface/50 text-muted">
              <th class="px-4 py-3 font-medium">Name</th>
              <th class="px-4 py-3 font-medium">Prefix</th>
              <th class="px-4 py-3 font-medium">Last used</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {#each tokens as token (token.id)}
              <tr class="border-t border-glass-border transition-colors hover:bg-background/20">
                <td class="px-4 py-3 font-medium">{token.name}</td>
                <td class="px-4 py-3 text-muted font-mono text-xs">{token.prefix}…</td>
                <td class="px-4 py-3 text-muted">{formatDate(token.lastUsedAt)}</td>
                <td class="px-4 py-3">
                  <Badge tone={token.revoked ? 'danger' : 'success'} dot>
                    {token.revoked ? 'Revoked' : 'Active'}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-right">
                  {#if !token.revoked}
                    <Button variant="danger" onclick={() => revoke(token.id, reload)}>Revoke</Button>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr>
                <td class="px-4 py-12" colspan="5">
                  <EmptyState title="No tokens yet" description="Create a token above to get started with the /v1 gateway." />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/snippet}
</Async>
