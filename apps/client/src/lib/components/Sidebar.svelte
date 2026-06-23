<script lang="ts">
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.svelte';
  import Logo from '$lib/components/ui/Logo.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  interface NavItem {
    href: string;
    label: string;
    icon: string;
  }

  interface NavGroup {
    label: string;
    items: NavItem[];
  }

  let { class: klass = '' }: { class?: string } = $props();

  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        {
          href: '/dashboard',
          label: 'Dashboard',
          icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        },
        {
          href: '/analytics',
          label: 'Analytics',
          icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        },
      ],
    },
    {
      label: 'Configuration',
      items: [
        {
          href: '/keys',
          label: 'API Keys',
          icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
        },
        {
          href: '/models',
          label: 'Models',
          icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
        },
        {
          href: '/strategies',
          label: 'Strategies',
          icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
        },
        {
          href: '/tokens',
          label: 'Tokens',
          icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
        },
      ],
    },
    {
      label: 'Tools',
      items: [
        {
          href: '/playground',
          label: 'Playground',
          icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
        },
        {
          href: '/logs',
          label: 'Logs',
          icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        },
      ],
    },
    {
      label: 'Account',
      items: [
        {
          href: '/settings',
          label: 'Settings',
          icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
        },
      ],
    },
  ];

  const adminGroup: NavGroup = {
    label: 'Admin',
    items: [
      {
        href: '/admin/users',
        label: 'Users',
        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      },
      {
        href: '/admin/settings',
        label: 'Admin Settings',
        icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      },
    ],
  };

  const current = $derived($page.url.pathname);
  const navGroups = $derived(
    authStore.user?.role === 'admin' ? [...groups, adminGroup] : groups,
  );

  function isActive(href: string): boolean {
    return current === href || current.startsWith(href + '/');
  }
</script>

<aside
  class="flex h-full flex-col border-r border-glass-border bg-surface/80 backdrop-blur-xl {klass}"
>
  <!-- Logo section -->
  <div class="flex shrink-0 items-center px-5 pt-5 pb-4">
    <Logo size="sm" />
  </div>

  <!-- Navigation -->
  <nav class="flex-1 overflow-y-auto px-3 pb-4">
    {#each navGroups as group (group.label)}
      <div class="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted first:mt-0">
        {group.label}
      </div>
      <div class="space-y-0.5">
        {#each group.items as item (item.href)}
          <a
            href={item.href}
            class="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150
              {isActive(item.href)
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted hover:bg-background/50 hover:text-foreground'}"
          >
            <svg
              class="h-4.5 w-4.5 shrink-0 {isActive(item.href) ? 'text-primary' : 'text-muted group-hover:text-foreground'}"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d={item.icon} />
            </svg>
            {item.label}
            {#if isActive(item.href)}
              <span class="ml-auto h-1.5 w-1.5 rounded-full bg-primary"></span>
            {/if}
          </a>
        {/each}
      </div>
    {/each}
  </nav>

  <!-- Bottom section: Theme toggle + user -->
  <div class="shrink-0 border-t border-glass-border px-3 py-3">
    <div class="flex items-center justify-between rounded-lg px-3 py-2">
      <div class="flex items-center gap-2 text-xs text-muted">
        <div class="h-2 w-2 rounded-full bg-accent"></div>
        {authStore.user?.role ?? 'user'}
      </div>
      <ThemeToggle />
    </div>
  </div>
</aside>
