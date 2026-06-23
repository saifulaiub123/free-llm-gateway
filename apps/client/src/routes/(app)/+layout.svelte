<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import MobileNav from '$lib/components/MobileNav.svelte';
  import UserMenu from '$lib/components/UserMenu.svelte';
  import Logo from '$lib/components/ui/Logo.svelte';

  let { children } = $props();

  let sidebarMobileOpen = $state(false);

  // SPA auth guard: there is no hooks.server.ts, so unauthenticated users are redirected here.
  onMount(() => {
    if (!authStore.isAuthenticated) {
      void goto('/login', { replaceState: true });
    }
  });

  function closeSidebar(): void {
    sidebarMobileOpen = false;
  }

  function toggleSidebar(): void {
    sidebarMobileOpen = !sidebarMobileOpen;
  }
</script>

<div class="flex min-h-screen bg-background">
  <!-- Desktop sidebar (always visible on md+) -->
  <Sidebar class="hidden w-56 shrink-0 md:flex" />

  <!-- Mobile sidebar overlay -->
  {#if sidebarMobileOpen}
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div
      class="fixed inset-0 z-40 bg-surface-overlay animate-fade-in md:hidden"
      onclick={closeSidebar}
      onkeydown={(e) => e.key === 'Escape' && closeSidebar()}
      role="presentation"
    ></div>

    <div class="fixed inset-y-0 left-0 z-50 w-64 animate-fade-in md:hidden">
      <Sidebar class="h-full rounded-r-2xl border-r shadow-lg" />
    </div>
  {/if}

  <!-- Main content area -->
  <div class="flex min-w-0 flex-1 flex-col">
    <!-- Top bar (desktop) -->
    <header class="hidden h-14 shrink-0 items-center justify-between border-b border-glass-border bg-surface/60 px-6 backdrop-blur-xl md:flex">
      <div class="text-sm text-muted">
        <!-- Breadcrumb placeholder — pages can set via store or pass as snippet -->
      </div>
      <div class="flex items-center gap-1.5">
        <UserMenu />
      </div>
    </header>

    <!-- Mobile header -->
    <header class="flex h-13 shrink-0 items-center justify-between border-b border-glass-border bg-surface/80 px-4 backdrop-blur-xl md:hidden">
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-background/50 hover:text-foreground"
        onclick={toggleSidebar}
        aria-label="Toggle navigation menu"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d={sidebarMobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
        </svg>
      </button>
      <Logo size="sm" showText={false} />
      <div class="flex items-center gap-1">
        <UserMenu class="[&>button]:px-1.5" />
      </div>
    </header>

    <!-- Page content -->
    <main class="min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
      {@render children()}
    </main>

    <!-- Mobile bottom nav -->
    <MobileNav class="md:hidden" />
  </div>
</div>
