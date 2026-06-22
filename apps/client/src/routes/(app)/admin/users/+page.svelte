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
  <Card>
    <h2 class="mb-3 text-sm font-semibold">Add a user</h2>
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
  </Card>

  {#if rowError}
    <p class="text-sm text-red-500">{rowError}</p>
  {/if}

  <div class="overflow-x-auto rounded-lg border border-border">
    <table class="w-full text-left text-sm">
      <thead class="bg-surface text-muted">
        <tr>
          <th class="px-4 py-2 font-medium">Email</th>
          <th class="px-4 py-2 font-medium">Role</th>
          <th class="px-4 py-2 font-medium">Created</th>
          <th class="px-4 py-2 font-medium">Enabled</th>
        </tr>
      </thead>
      <tbody>
        {#each items as user (user.id)}
          <tr class="border-t border-border">
            <td class="px-4 py-2 font-medium">{user.email}</td>
            <td class="px-4 py-2">
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
            <td class="px-4 py-2 text-muted">{formatDate(user.createdAt)}</td>
            <td class="px-4 py-2">
              <Toggle
                checked={user.isActive}
                label="Enable {user.email}"
                onchange={(next) => patch(user, { isActive: next })}
              />
            </td>
          </tr>
        {:else}
          {#if started && !loading}
            <tr><td class="px-4 py-6 text-center text-muted" colspan="4">No users.</td></tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>

  {#if listError}
    <p class="text-sm text-red-500">{listError}</p>
  {/if}

  {#if loading}
    <p class="text-sm text-muted">Loading…</p>
  {:else if nextCursor !== null}
    <Button variant="secondary" onclick={loadMore}>Load more</Button>
  {/if}
</div>
