<script lang="ts">
  import { untrack } from 'svelte';
  import { adminApi } from '$lib/api';
  import { ApiError } from '$lib/api/error';
  import type { GlobalSetting } from '$lib/api/types';
  import Button from './ui/Button.svelte';
  import Toggle from './ui/Toggle.svelte';

  interface Props {
    setting: GlobalSetting;
    onsaved: () => void;
  }

  let { setting, onsaved }: Props = $props();

  // Infer the control from the value's runtime type (the registry's zod schema isn't serialized).
  const kind = $derived(
    typeof setting.value === 'boolean'
      ? 'boolean'
      : typeof setting.value === 'number'
        ? 'number'
        : 'string',
  );

  let boolValue = $state(untrack(() => Boolean(setting.value)));
  let textValue = $state(untrack(() => String(setting.value ?? '')));
  let message = $state('');
  let error = $state('');
  let busy = $state(false);

  async function save(value: unknown): Promise<void> {
    message = '';
    error = '';
    busy = true;
    try {
      await adminApi.updateSetting(setting.key, value);
      message = 'Saved';
      onsaved();
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Save failed.';
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4">
  <div class="min-w-0">
    <p class="font-medium">{setting.key}</p>
    <p class="mt-0.5 text-xs text-muted">{setting.description}</p>
    {#if message}
      <p class="mt-1 text-xs text-green-500">{message}</p>
    {/if}
    {#if error}
      <p class="mt-1 text-xs text-red-500">{error}</p>
    {/if}
  </div>
  <div class="flex shrink-0 items-center gap-2">
    {#if kind === 'boolean'}
      <Toggle
        checked={boolValue}
        label={setting.key}
        disabled={busy}
        onchange={(next) => {
          boolValue = next;
          void save(next);
        }}
      />
    {:else}
      <input
        type={kind === 'number' ? 'number' : 'text'}
        bind:value={textValue}
        class="w-40 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
      />
      <Button
        disabled={busy}
        onclick={() => save(kind === 'number' ? Number(textValue) : textValue)}
      >
        Save
      </Button>
    {/if}
  </div>
</div>
