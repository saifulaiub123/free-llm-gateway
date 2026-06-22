<script lang="ts">
  import { adminApi } from '$lib/api';
  import Async from '$lib/components/Async.svelte';
  import AdminSettingRow from '$lib/components/AdminSettingRow.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
</script>

<PageHeader title="Admin settings" description="Global settings that apply to every user. New settings appear here automatically from the registry." />

<Async load={() => adminApi.listSettings()}>
  {#snippet children(settings, reload)}
    {#if settings.length === 0}
      <p class="text-sm text-muted">No global settings are defined.</p>
    {:else}
      <div class="space-y-3">
        {#each settings as setting (setting.key)}
          {#key setting.key}
            <AdminSettingRow {setting} onsaved={reload} />
          {/key}
        {/each}
      </div>
    {/if}
  {/snippet}
</Async>
