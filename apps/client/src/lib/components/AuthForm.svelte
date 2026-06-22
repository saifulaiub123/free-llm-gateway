<script lang="ts">
  import type { Snippet } from 'svelte';
  import TextField from './ui/TextField.svelte';
  import Button from './ui/Button.svelte';
  import Card from './ui/Card.svelte';
  import { ApiError } from '$lib/api/error';

  interface Props {
    title: string;
    submitLabel: string;
    requireConfirm?: boolean;
    submit: (email: string, password: string) => Promise<void>;
    footer: Snippet;
  }

  let { title, submitLabel, requireConfirm = false, submit, footer }: Props = $props();

  let email = $state('');
  let password = $state('');
  let confirm = $state('');
  let error = $state('');
  let loading = $state(false);

  /** Client-side validation mirroring the server DTO rules (valid email, 8+ char password). */
  function validate(): string | null {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (requireConfirm && password !== confirm) return 'Passwords do not match.';
    return null;
  }

  async function onsubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      error = problem;
      return;
    }
    error = '';
    loading = true;
    try {
      await submit(email, password);
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<Card>
  <form class="space-y-4" {onsubmit}>
    <h1 class="text-xl font-semibold">{title}</h1>
    <TextField label="Email" type="email" bind:value={email} autocomplete="email" required />
    <TextField
      label="Password"
      type="password"
      bind:value={password}
      autocomplete={requireConfirm ? 'new-password' : 'current-password'}
      required
    />
    {#if requireConfirm}
      <TextField
        label="Confirm password"
        type="password"
        bind:value={confirm}
        autocomplete="new-password"
        required
      />
    {/if}
    {#if error}
      <p class="text-sm text-red-500">{error}</p>
    {/if}
    <Button type="submit" full disabled={loading}>
      {loading ? 'Please wait…' : submitLabel}
    </Button>
    <p class="text-center text-sm text-muted">{@render footer()}</p>
  </form>
</Card>
