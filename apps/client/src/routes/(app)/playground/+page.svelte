<script lang="ts">
  import { GATEWAY_BASE } from '$lib/config';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import MetricBadge from '$lib/components/MetricBadge.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';

  let token = $state('');
  let model = $state('auto');
  let prompt = $state('Say hello in one short sentence.');
  let busy = $state(false);
  let error = $state('');
  let response = $state('');
  let routedVia = $state<string | null>(null);
  let attempts = $state<string | null>(null);

  async function send(): Promise<void> {
    if (!token.trim() || !prompt.trim()) {
      error = 'A token and a prompt are required.';
      return;
    }
    error = '';
    response = '';
    routedVia = null;
    attempts = null;
    busy = true;
    try {
      const res = await fetch(`${GATEWAY_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token.trim()}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
      });
      routedVia = res.headers.get('X-Routed-Via');
      attempts = res.headers.get('X-Fallback-Attempts');
      const text = await res.text();
      if (!res.ok) {
        error = `Gateway returned ${res.status}: ${text}`;
        return;
      }
      response = JSON.stringify(JSON.parse(text), null, 2);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Request failed.';
    } finally {
      busy = false;
    }
  }
</script>

<PageHeader title="Playground" description="Send a test chat through the /v1 gateway exactly as an external client would, using one of your API tokens." />

<div class="grid gap-6 lg:grid-cols-2">
  <Card>
    <div class="space-y-3">
      <TextField label="API token" type="password" bind:value={token} placeholder="sqr-llm-…" />
      <TextField label="Model" bind:value={model} placeholder="auto" />
      <div class="space-y-1">
        <label for="pg-prompt" class="block text-sm font-medium">Prompt</label>
        <textarea
          id="pg-prompt"
          bind:value={prompt}
          rows="5"
          class="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        ></textarea>
      </div>
      <Button disabled={busy} onclick={send}>{busy ? 'Sending…' : 'Send request'}</Button>
      {#if error}
        <p class="text-sm text-red-500">{error}</p>
      {/if}
    </div>
  </Card>

  <Card>
    <h2 class="mb-3 text-sm font-semibold">Response</h2>
    {#if routedVia || attempts}
      <div class="mb-3 flex flex-wrap gap-2">
        {#if routedVia}
          <MetricBadge label="X-Routed-Via" value={routedVia} />
        {/if}
        {#if attempts}
          <MetricBadge label="X-Fallback-Attempts" value={attempts} />
        {/if}
      </div>
    {/if}
    {#if response}
      <pre class="max-h-96 overflow-auto rounded bg-background p-3 text-xs">{response}</pre>
    {:else}
      <p class="text-sm text-muted">The gateway response and routing headers will appear here.</p>
    {/if}
  </Card>
</div>
