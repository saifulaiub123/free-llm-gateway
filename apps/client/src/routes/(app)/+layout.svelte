<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  let { children } = $props();

  // SPA auth guard: there is no hooks.server.ts, so unauthenticated users are redirected here.
  onMount(() => {
    if (!authStore.isAuthenticated) {
      void goto('/login', { replaceState: true });
    }
  });

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/keys', label: 'Keys' },
    { href: '/models', label: 'Models' },
    { href: '/strategies', label: 'Strategies' },
    { href: '/tokens', label: 'Tokens' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/logs', label: 'Logs' },
    { href: '/playground', label: 'Playground' },
    { href: '/settings', label: 'Settings' },
  ];

  const current = $derived($page.url.pathname);

  async function logout(): Promise<void> {
    await authStore.logout();
    await goto('/login', { replaceState: true });
  }
</script>

<div class="flex min-h-screen">
  <aside class="hidden w-56 shrink-0 border-r border-border bg-surface md:block">
    <div class="px-4 py-4 text-lg font-semibold">Free LLM Gateway</div>
    <nav class="space-y-1 px-2">
      {#each links as link (link.href)}
        <a
          href={link.href}
          class="block rounded px-3 py-2 text-sm transition {current.startsWith(link.href)
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-background'}"
        >
          {link.label}
        </a>
      {/each}
    </nav>
  </aside>

  <div class="flex min-w-0 flex-1 flex-col">
    <header class="flex items-center justify-between border-b border-border px-6 py-3">
      <nav class="flex gap-2 overflow-x-auto md:hidden">
        {#each links as link (link.href)}
          <a
            href={link.href}
            class="whitespace-nowrap rounded px-2 py-1 text-xs {current.startsWith(link.href)
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-surface'}"
          >
            {link.label}
          </a>
        {/each}
      </nav>
      <div class="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          class="rounded border border-border px-3 py-1 text-sm hover:bg-surface"
          onclick={logout}
        >
          Sign out
        </button>
      </div>
    </header>
    <main class="min-w-0 flex-1 px-6 py-6">
      {@render children()}
    </main>
  </div>
</div>
