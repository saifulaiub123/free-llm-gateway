<script lang="ts">
  import { page } from '$app/stores';

  interface TabItem {
    href: string;
    label: string;
    icon: string;
  }

  let { class: klass = '' }: { class?: string } = $props();

  const tabs: TabItem[] = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      href: '/keys',
      label: 'Keys',
      icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    },
    {
      href: '/models',
      label: 'Models',
      icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
    },
    {
      href: '/playground',
      label: 'Play',
      icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
    },
    {
      href: '/more',
      label: 'More',
      icon: 'M4 6h16M4 12h16M4 18h16',
    },
  ];

  const current = $derived($page.url.pathname);

  function isActive(tab: TabItem): boolean {
    if (tab.href === '/more') {
      // "More" tab is active when on pages not in the main tabs
      return !tabs.slice(0, -1).some((t) => current === t.href || current.startsWith(t.href + '/'));
    }
    return current === tab.href || current.startsWith(tab.href + '/');
  }
</script>

<nav
  class="flex items-center justify-around border-t border-glass-border bg-surface/90 px-2 pb-safe-bottom backdrop-blur-xl {klass}"
>
  {#each tabs as tab (tab.href)}
    {#if tab.href === '/more'}
      <!-- Mobile "More" link — opens the sidebar as an overlay instead -->
      {#if isActive(tab)}
        <div
          class="relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-primary"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d={tab.icon} />
          </svg>
          <span class="text-[10px] font-medium">{tab.label}</span>
        </div>
      {:else}
        <a
          href={tab.href}
          class="relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted transition-colors hover:text-foreground"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d={tab.icon} />
          </svg>
          <span class="text-[10px] font-medium">{tab.label}</span>
        </a>
      {/if}
    {:else}
      <a
        href={tab.href}
        class="relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors
          {isActive(tab)
            ? 'text-primary'
            : 'text-muted hover:text-foreground'}"
      >
        {#if isActive(tab)}
          <span class="absolute -top-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary"></span>
        {/if}
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{isActive(tab) ? 2.25 : 1.75}" stroke-linecap="round" stroke-linejoin="round">
          <path d={tab.icon} />
        </svg>
        <span class="text-[10px] font-medium">{tab.label}</span>
      </a>
    {/if}
  {/each}
</nav>
