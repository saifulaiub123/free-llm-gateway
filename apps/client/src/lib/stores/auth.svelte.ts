import { browser } from '$app/environment';
import { API_BASE } from '../config';
import type { Principal, TokenPair } from '../api/types';

const ACCESS_KEY = 'flg.accessToken';
const REFRESH_KEY = 'flg.refreshToken';

/** Decodes the `sub`/`role` claims from a JWT without verifying it (verification is the server's job). */
function decodePrincipal(accessToken: string): Principal | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as { sub?: number; role?: string };
    if (typeof claims.sub !== 'number') return null;
    return { id: claims.sub, role: claims.role ?? 'user' };
  } catch {
    return null;
  }
}

/** Returns true when the JWT's `exp` claim (epoch seconds) is in the past (with leeway). */
function isTokenExpired(accessToken: string, leewaySeconds = 10): boolean {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return true;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as { exp?: number };
    if (typeof claims.exp !== 'number') return false; // no exp → treat as non-expiring
    return Date.now() >= (claims.exp - leewaySeconds) * 1000;
  } catch {
    return true;
  }
}

/**
 * Reactive auth state (Svelte 5 runes).
 *
 * WHY a runes class holding the token pair + decoded principal: it is the single source of truth the
 * `apiFetch` wrapper and the route guards read. Tokens persist to `localStorage` so a page reload in
 * this SPA keeps the session. Login/refresh use raw `fetch` (not `apiFetch`) to avoid an import cycle
 * and so a failed refresh never recurses through the 401-retry path.
 */
class AuthStore {
  accessToken = $state<string | null>(null);
  refreshToken = $state<string | null>(null);
  user = $state<Principal | null>(null);

  /** True once a valid access token (and decoded principal) is present. */
  get isAuthenticated(): boolean {
    return this.user !== null;
  }

  /** Restores any persisted session from `localStorage` (call once on app start). */
  init(): void {
    if (!browser) return;
    const access = localStorage.getItem(ACCESS_KEY);
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (access && refresh) {
      this.apply({ accessToken: access, refreshToken: refresh });
      // If the restored access token is already expired, silently refresh in the background
      // so the first API call doesn't need a 401 round-trip.
      if (isTokenExpired(access)) {
        this.tryRefresh();
      }
    }
  }

  /** Authenticates with email + password, persisting the returned token pair. */
  async login(email: string, password: string): Promise<void> {
    await this.exchange('/auth/login', { email, password });
  }

  /** Registers a new account, persisting the returned token pair. */
  async register(email: string, password: string): Promise<void> {
    await this.exchange('/auth/register', { email, password });
  }

  /** Revokes the refresh token server-side (best-effort) and clears local state. */
  async logout(): Promise<void> {
    const refreshToken = this.refreshToken;
    this.clear();
    if (refreshToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
  }

  /** Tracks the in-flight refresh so concurrent 401 retries share one request. */
  private refreshPromise: Promise<boolean> | null = null;

  /**
   * Attempts a token refresh with mutual exclusion.
   *
   * WHY shared-promise guard: when the access token expires, several concurrent API calls all hit 401
   * at the same time and each calls tryRefresh(). Without this guard they'd each try to rotate the
   * refresh token independently — the first succeeds, the rest hit server-side "reuse detection"
   * (the old refresh token was already revoked) and call clear(), which logs the user out.
   */
  async tryRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.executeRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /** Performs the actual POST to `/auth/refresh`. */
  private async executeRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!response.ok) {
        this.clear();
        return false;
      }
      const body = (await response.json()) as { data: TokenPair };
      this.apply(body.data);
      return true;
    } catch {
      return false;
    }
  }

  /** POSTs credentials to an auth endpoint and applies the resulting token pair. */
  private async exchange(path: string, payload: Record<string, string>): Promise<void> {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (!response.ok) {
      const { parseErrorMessage, ApiError } = await import('../api/error');
      throw new ApiError(response.status, parseErrorMessage(text));
    }
    this.apply((JSON.parse(text) as { data: TokenPair }).data);
  }

  /** Stores a new token pair, decodes the principal, and persists both tokens. */
  private apply(tokens: TokenPair): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.user = decodePrincipal(tokens.accessToken);
    if (browser) {
      localStorage.setItem(ACCESS_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    }
  }

  /** Clears in-memory + persisted session state. */
  private clear(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    if (browser) {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
  }
}

export const authStore = new AuthStore();
