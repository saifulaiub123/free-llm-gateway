<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';

  let { class: klass = '' }: { class?: string } = $props();

  let open = $state(false);

  async function handleLogout(): Promise<void> {
    open = false;
    await authStore.logout();
    await goto('/login', { replaceState: true });
  }

  function goTo(path: string): void {
    open = false;
    void goto(path);
  }
</script>

<div class="relative {klass}">
  <button
    type="button"
    onclick={() => (open = !open)}
    class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-background/50 hover:text-foreground"
    aria-haspopup="true"
    aria-expanded={open}
  >
    <div
      class="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-white shadow-sm"
    >
      {authStore.user?.id?.toString().slice(-2) ?? 'U'}
    </div>
    <svg class="h-4 w-4 transition-transform duration-150 {open ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if open}
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div
      class="fixed inset-0 z-40"
      onclick={() => (open = false)}
      onkeydown={(e) => e.key === 'Escape' && (open = false)}
      role="presentation"
    ></div>

    <div
      class="glass-raised absolute right-0 top-full z-50 mt-1.5 w-48 origin-top-right animate-fade-in rounded-xl p-1 shadow-lg"
    >
      <div class="border-b border-glass-border px-3 py-2.5">
        <p class="text-xs font-medium text-foreground">User #{authStore.user?.id}</p>
        <p class="text-[11px] text-muted">{authStore.user?.role ?? 'user'}</p>
      </div>

      <button
        type="button"
        onclick={() => goTo('/settings')}
        class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-background/50 hover:text-foreground"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </button>

      <div class="my-1 border-t border-glass-border"></div>

      <button
        type="button"
        onclick={handleLogout}
        class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Sign out
      </button>
    </div>
  {/if}
</div>
