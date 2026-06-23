<script lang="ts">
  import { goto } from '$app/navigation';
  import AuthForm from '$lib/components/AuthForm.svelte';
  import { authStore } from '$lib/stores/auth.svelte';

  async function submit(email: string, password: string): Promise<void> {
    await authStore.login(email, password);
    await goto('/dashboard', { replaceState: true });
  }
</script>

<AuthForm title="Sign in" submitLabel="Sign in" {submit}>
  {#snippet footer()}
    No account? <a class="text-primary hover:underline" href="/register">Create one</a>
  {/snippet}
</AuthForm>
