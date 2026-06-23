<script lang="ts">
  import { GATEWAY_BASE } from '$lib/config';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';

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
  <!-- Request panel -->
  <Card title="Request" variant="raised">
    {#snippet children()}
      <div class="space-y-3">
        <TextField label="API token" type="password" bind:value={token} placeholder="sqr-llm-…" />
        <TextField label="Model" bind:value={model} placeholder="auto" />
        <div class="space-y-1.5">
          <label for="pg-prompt" class="text-sm font-medium text-foreground">Prompt</label>
          <textarea
            id="pg-prompt"
            bind:value={prompt}
            rows="6"
            class="w-full rounded-lg border border-glass-border bg-background px-3 py-2.5 text-sm outline-none transition-all duration-150 placeholder:text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px] focus:shadow-primary/20"
          ></textarea>
        </div>
        <Button disabled={busy} onclick={send}>
          {busy ? 'Sending…' : 'Send request'}
        </Button>
        {#if error}
          <div class="flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        {/if}
      </div>
    {/snippet}
  </Card>

  <!-- Response panel -->
  <Card title="Response" variant="raised">
    {#snippet children()}
      {#if busy}
        <div class="space-y-3">
          <Skeleton shape="text" />
          <Skeleton shape="text" />
          <Skeleton shape="text" class="w-3/4" />
        </div>
      {:else if response}
        {#if routedVia || attempts}
          <div class="mb-3 flex flex-wrap gap-2">
            {#if routedVia}
              <Badge tone="neutral">
                <span class="text-[11px]">Routed: {routedVia}</span>
              </Badge>
            {/if}
            {#if attempts}
              <Badge tone="neutral">
                <span class="text-[11px]">Fallbacks: {attempts}</span>
              </Badge>
            {/if}
          </div>
        {/if}
        <pre class="max-h-96 overflow-auto rounded-lg bg-background p-4 font-mono text-xs leading-relaxed"><code>{response}</code></pre>
      {:else}
        <div class="flex flex-col items-center justify-center py-8 text-center">
          <svg class="mb-3 h-10 w-10 text-muted/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p class="text-sm text-muted">Send a request to see the response here.</p>
        </div>
      {/if}
    {/snippet}
  </Card>
</div>
