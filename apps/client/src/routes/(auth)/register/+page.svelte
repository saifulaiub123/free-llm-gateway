<script lang="ts">
  import { goto } from '$app/navigation';
  import AuthForm from '$lib/components/AuthForm.svelte';
  import { authStore } from '$lib/stores/auth.svelte';

  async function submit(email: string, password: string): Promise<void> {
    await authStore.register(email, password);
    await goto('/dashboard', { replaceState: true });
  }
</script>

<AuthForm title="Create account" submitLabel="Create account" requireConfirm {submit}>
  {#snippet footer()}
    Already have an account? <a class="text-primary hover:underline" href="/login">Sign in</a>
  {/snippet}
</AuthForm>
