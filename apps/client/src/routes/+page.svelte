<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';

  // The root path is a router shim: send authenticated users to the dashboard, others to login.
  onMount(() => {
    void goto(authStore.isAuthenticated ? '/dashboard' : '/login', { replaceState: true });
  });
</script>

<div class="flex min-h-screen items-center justify-center">
  <p class="text-muted">Loading…</p>
</div>
