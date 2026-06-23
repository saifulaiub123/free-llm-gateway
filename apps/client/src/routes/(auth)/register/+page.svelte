<script lang="ts">
  import { goto } from '$app/navigation';
  import { authApi } from '$lib/api';
  import AuthForm from '$lib/components/AuthForm.svelte';
  import Async from '$lib/components/Async.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { authStore } from '$lib/stores/auth.svelte';

  async function submit(email: string, password: string): Promise<void> {
    await authStore.register(email, password);
    await goto('/dashboard', { replaceState: true });
  }
</script>

<Async load={() => authApi.registrationStatus()}>
  {#snippet children(status)}
    {#if !status.registrationEnabled && status.hasUsers}
      <Card>
        <h1 class="text-xl font-semibold">Registration is closed</h1>
        <p class="mt-2 text-sm text-muted">
          An administrator has disabled self-registration. Ask an admin to create your account, then
          <a class="text-primary hover:underline" href="/login">sign in</a>.
        </p>
      </Card>
    {:else}
      <AuthForm
        title={status.hasUsers ? 'Create account' : 'Create the first admin account'}
        submitLabel={status.hasUsers ? 'Create account' : 'Create admin account'}
        requireConfirm
        {submit}
      >
        {#snippet footer()}
          {#if status.hasUsers}
            Already have an account? <a class="text-primary hover:underline" href="/login">Sign in</a>
          {:else}
            This first account becomes the administrator.
          {/if}
        {/snippet}
      </AuthForm>
    {/if}
  {/snippet}
</Async>
