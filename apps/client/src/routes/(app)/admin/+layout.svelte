<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';

  let { children } = $props();

  // Client-side admin guard: hide the section from non-admins. The server's RolesGuard is the real
  // boundary — every /api/v1/admin/* call still 403s for a non-admin regardless of this redirect.
  onMount(() => {
    if (authStore.user?.role !== 'admin') {
      void goto('/dashboard', { replaceState: true });
    }
  });
</script>

{#if authStore.user?.role === 'admin'}
  {@render children()}
{/if}
