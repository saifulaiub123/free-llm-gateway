<script lang="ts">
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import Logo from '$lib/components/ui/Logo.svelte';

  let { children } = $props();
</script>

<div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
  <!-- Decorative gradient orbs -->
  <div class="pointer-events-none absolute -left-48 -top-48 h-[30rem] w-[30rem] rounded-full bg-primary/8 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-40 -right-40 h-[26rem] w-[26rem] rounded-full bg-accent/8 blur-3xl"></div>
  <div class="pointer-events-none absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl"></div>

  <!-- Theme toggle -->
  <div class="absolute right-4 top-4 z-10">
    <ThemeToggle />
  </div>

  <!-- Auth card wrapper -->
  <div class="relative w-full max-w-sm">
    <!-- Logo -->
    <div class="mb-8 flex justify-center">
      <Logo size="lg" />
    </div>

    <!-- Auth content (Card from AuthForm) -->
    {@render children()}

    <!-- Footer text -->
    <p class="mt-6 text-center text-xs text-muted">
      Free LLM Gateway &mdash; self-hosted AI routing
    </p>
  </div>
</div>
