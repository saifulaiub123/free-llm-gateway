<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '$lib/api';
  import { ApiError } from '$lib/api/error';
  import type { AdminUser } from '$lib/api/types';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import { formatDate } from '$lib/format';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';

  const PAGE_SIZE = 25;

  let items = $state<AdminUser[]>([]);
  let nextCursor = $state<number | null>(null);
  let loading = $state(false);
  let listError = $state('');
  let started = $state(false);
  let rowError = $state('');

  // Add-user form.
  let email = $state('');
  let password = $state('');
  let role = $state<'admin' | 'user'>('user');
  let addError = $state('');
  let adding = $state(false);

  async function loadMore(): Promise<void> {
    loading = true;
    listError = '';
    try {
      const page = await adminApi.listUsers(nextCursor ?? undefined, PAGE_SIZE);
      items = [...items, ...page.items];
      nextCursor = page.nextCursor;
      started = true;
    } catch (err) {
      listError = err instanceof Error ? err.message : 'Failed to load users.';
    } finally {
      loading = false;
    }
  }

  onMount(loadMore);

  function replace(updated: AdminUser): void {
    items = items.map((item) => (item.id === updated.id ? updated : item));
  }

  async function patch(user: AdminUser, change: { role?: 'admin' | 'user'; isActive?: boolean }): Promise<void> {
    rowError = '';
    try {
      replace(await adminApi.updateUser(user.id, change));
    } catch (err) {
      rowError = err instanceof ApiError ? err.message : 'Update failed.';
    }
  }

  async function addUser(): Promise<void> {
    if (!email.trim() || password.length < 8) {
      addError = 'Email and a password of at least 8 characters are required.';
      return;
    }
    addError = '';
    adding = true;
    try {
      const created = await adminApi.createUser(email.trim(), password, role);
      items = [created, ...items];
      email = '';
      password = '';
      role = 'user';
    } catch (err) {
      addError = err instanceof ApiError ? err.message : 'Failed to create user.';
    } finally {
      adding = false;
    }
  }
</script>

<PageHeader title="Users" description="Manage accounts, roles, and access. Disabling an account blocks its login." />

<div class="space-y-6">
  <Card title="Add a user">
    {#snippet children()}
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <TextField label="Email" type="email" bind:value={email} placeholder="teammate@example.com" />
        <TextField label="Password" type="password" bind:value={password} autocomplete="new-password" />
        <Select
          label="Role"
          bind:value={role}
          options={[
            { value: 'user', label: 'User' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
        <Button full disabled={adding} onclick={addUser}>Add user</Button>
      </div>
      {#if addError}
        <p class="mt-2 text-sm text-red-500">{addError}</p>
      {/if}
    {/snippet}
  </Card>

  {#if rowError}
    <div class="flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
      <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {rowError}
    </div>
  {/if}

  <div class="overflow-hidden rounded-xl border border-glass-border">
    <table class="w-full text-left text-sm">
      <thead>
        <tr class="bg-surface/50 text-muted">
          <th class="px-4 py-3 font-medium">Email</th>
          <th class="px-4 py-3 font-medium">Role</th>
          <th class="px-4 py-3 font-medium">Created</th>
          <th class="px-4 py-3 font-medium">Enabled</th>
        </tr>
      </thead>
      <tbody>
        {#each items as user (user.id)}
          <tr class="border-t border-glass-border transition-colors hover:bg-background/20">
            <td class="px-4 py-3 font-medium">{user.email}</td>
            <td class="px-4 py-3">
              <div class="w-28">
                <Select
                  value={user.role}
                  options={[
                    { value: 'user', label: 'User' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                  onchange={(value) => patch(user, { role: value as 'admin' | 'user' })}
                />
              </div>
            </td>
            <td class="px-4 py-3 text-muted">{formatDate(user.createdAt)}</td>
            <td class="px-4 py-3">
              <Toggle
                checked={user.isActive}
                label="Enable {user.email}"
                onchange={(next) => patch(user, { isActive: next })}
              />
            </td>
          </tr>
        {:else}
          {#if started && !loading}
            <tr><td class="px-4 py-12 text-center text-muted" colspan="4">No users found.</td></tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>

  {#if listError}
    <p class="text-sm text-red-500">{listError}</p>
  {/if}

  <div class="flex items-center justify-center">
    {#if loading}
      <div class="flex items-center gap-2 text-sm text-muted">
        <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
        </svg>
        Loading users…
      </div>
    {:else if nextCursor !== null}
      <Button variant="secondary" onclick={loadMore}>Load more</Button>
    {/if}
  </div>
</div>
