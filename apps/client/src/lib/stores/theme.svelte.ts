import { browser } from '$app/environment';

/** The themes shipped with the app. Add a new id here after creating its token file + selector. */
export type ThemeName = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DEFAULT_THEME: ThemeName = 'light';

/** Reads the persisted theme, falling back to the OS preference, then the default. */
const readInitialTheme = (): ThemeName => {
  if (!browser) return DEFAULT_THEME;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : DEFAULT_THEME;
};

/** Applies the theme to the document root so the token files take effect. */
const applyTheme = (theme: ThemeName): void => {
  if (browser) document.documentElement.dataset.theme = theme;
};

/**
 * Reactive theme state (Svelte 5 runes).
 *
 * WHY a class with `$state`: a single source of truth for the active theme that any component can
 * read reactively and mutate via `set`/`toggle`, while persistence + DOM application stay
 * encapsulated here. Call `init()` once on mount to sync the store with the persisted value.
 */
class ThemeStore {
  current = $state<ThemeName>(DEFAULT_THEME);

  /** Loads the persisted/preferred theme and applies it. Safe to call only in the browser. */
  init(): void {
    this.set(readInitialTheme());
  }

  /** Sets, persists, and applies a theme. */
  set(theme: ThemeName): void {
    this.current = theme;
    if (browser) localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }

  /** Switches between light and dark. */
  toggle(): void {
    this.set(this.current === 'dark' ? 'light' : 'dark');
  }
}

export const themeStore = new ThemeStore();
