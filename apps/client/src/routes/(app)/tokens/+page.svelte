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
  import { formatDate } from '$lib/format';

  let name = $state('');
  let error = $state('');
  let busy = $state(false);
  // The freshly created plaintext token — shown exactly once, never retrievable again.
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

<PageHeader title="API tokens" description="Tokens authenticate external clients against the /v1 gateway. The secret is shown only once." />

<Async load={() => tokensApi.list()}>
  {#snippet children(tokens: ApiTokenMetadata[], reload)}
    <div class="space-y-6">
      <Card>
        <h2 class="mb-3 text-sm font-semibold">Create a token</h2>
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
          <div class="mt-4 rounded border border-amber-500/40 bg-amber-500/10 p-3">
            <p class="text-xs font-medium text-amber-500">
              Copy this token now — it will not be shown again.
            </p>
            <div class="mt-2 flex items-center gap-2">
              <code class="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 text-sm">
                {plaintext}
              </code>
              <Button variant="secondary" onclick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
            </div>
          </div>
        {/if}
      </Card>

      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full text-left text-sm">
          <thead class="bg-surface text-muted">
            <tr>
              <th class="px-4 py-2 font-medium">Name</th>
              <th class="px-4 py-2 font-medium">Prefix</th>
              <th class="px-4 py-2 font-medium">Last used</th>
              <th class="px-4 py-2 font-medium">Status</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {#each tokens as token (token.id)}
              <tr class="border-t border-border">
                <td class="px-4 py-2 font-medium">{token.name}</td>
                <td class="px-4 py-2 text-muted">{token.prefix}…</td>
                <td class="px-4 py-2 text-muted">{formatDate(token.lastUsedAt)}</td>
                <td class="px-4 py-2">
                  {#if token.revoked}
                    <Badge tone="danger">revoked</Badge>
                  {:else}
                    <Badge tone="success">active</Badge>
                  {/if}
                </td>
                <td class="px-4 py-2 text-right">
                  {#if !token.revoked}
                    <Button variant="danger" onclick={() => revoke(token.id, reload)}>Revoke</Button>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr>
                <td class="px-4 py-6 text-center text-muted" colspan="5">No tokens yet.</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/snippet}
</Async>
