import { apiFetch } from './client';
import type {
  AdminUser,
  AdminUserPage,
  ApiTokenMetadata,
  CreatedToken,
  FetchModelsResult,
  GlobalSetting,
  LogPage,
  ModelView,
  Provider,
  ProviderKey,
  ProviderUsageRow,
  RegistrationStatus,
  ReorderItem,
  StrategyType,
  StrategyView,
  UsageSummary,
} from './types';

/** Provider catalog + per-user key management (`/api/v1/providers`). */
export const providersApi = {
  list: () => apiFetch<Provider[]>('/providers'),
  listKeys: () => apiFetch<ProviderKey[]>('/providers/keys'),
  addKey: (providerKey: string, apiKey: string, label?: string) =>
    apiFetch<ProviderKey>(`/providers/${providerKey}/keys`, {
      method: 'POST',
      body: { apiKey, ...(label ? { label } : {}) },
    }),
  removeKey: (id: number) =>
    apiFetch<{ removed: boolean }>(`/providers/keys/${id}`, { method: 'DELETE' }),
};

/** Model catalog + per-user enable/disable + custom models (`/api/v1/models`). */
export const modelsApi = {
  list: () => apiFetch<ModelView[]>('/models'),
  fetchForKey: (keyId: number) =>
    apiFetch<FetchModelsResult>(`/providers/keys/${keyId}/fetch-models`, { method: 'POST' }),
  update: (userModelId: number, patch: { enabled?: boolean; overrides?: Record<string, unknown> }) =>
    apiFetch<{ id: number; enabled: boolean }>(`/models/${userModelId}`, {
      method: 'PATCH',
      body: patch,
    }),
  addCustom: (body: {
    providerKey: string;
    modelId: string;
    displayName: string;
    inputCostPer1m?: number;
    outputCostPer1m?: number;
    capabilities?: Record<string, boolean>;
  }) => apiFetch<ModelView>('/models/custom', { method: 'POST', body }),
  removeCustom: (id: number) =>
    apiFetch<{ removed: boolean }>(`/models/custom/${id}`, { method: 'DELETE' }),
};

/** Per-user routing strategy management (`/api/v1/strategies`). */
export const strategiesApi = {
  list: () => apiFetch<StrategyView[]>('/strategies'),
  create: (type: StrategyType, name: string, config?: Record<string, unknown>) =>
    apiFetch<StrategyView>('/strategies', {
      method: 'POST',
      body: { type, name, ...(config ? { config } : {}) },
    }),
  update: (id: number, patch: { name?: string; config?: Record<string, unknown> }) =>
    apiFetch<StrategyView>(`/strategies/${id}`, { method: 'PATCH', body: patch }),
  reorder: (id: number, items: ReorderItem[]) =>
    apiFetch<{ updated: number }>(`/strategies/${id}/order`, { method: 'PUT', body: { items } }),
  setConfig: (id: number, config: Record<string, unknown>) =>
    apiFetch<StrategyView>(`/strategies/${id}/config`, { method: 'PATCH', body: { config } }),
  setDefault: (id: number) =>
    apiFetch<{ default: number }>(`/strategies/${id}/default`, { method: 'PUT' }),
};

/** LLM API token management (`/api/v1/tokens`). */
export const tokensApi = {
  list: () => apiFetch<ApiTokenMetadata[]>('/tokens'),
  create: (name: string) =>
    apiFetch<CreatedToken>('/tokens', { method: 'POST', body: { name } }),
  revoke: (id: number) =>
    apiFetch<{ revoked: boolean }>(`/tokens/${id}`, { method: 'DELETE' }),
};

/** Usage analytics + paginated logs (`/api/v1/analytics`, `/api/v1/logs`). */
export const analyticsApi = {
  summary: (window?: string) =>
    apiFetch<UsageSummary>('/analytics/summary', { query: { window } }),
  byProvider: (window?: string) =>
    apiFetch<ProviderUsageRow[]>('/analytics/by-provider', { query: { window } }),
  logs: (cursor?: number, limit?: number) =>
    apiFetch<LogPage>('/logs', { query: { cursor, limit } }),
};

/** Public auth status (`/api/v1/auth`) — no token required. */
export const authApi = {
  registrationStatus: () => apiFetch<RegistrationStatus>('/auth/registration-status'),
};

/** Admin-only governance (`/api/v1/admin`) — requires the `admin` role server-side. */
export const adminApi = {
  listSettings: () => apiFetch<GlobalSetting[]>('/admin/settings'),
  updateSetting: (key: string, value: unknown) =>
    apiFetch<{ updated: true }>(`/admin/settings/${key}`, { method: 'PUT', body: { value } }),
  listUsers: (cursor?: number, limit?: number) =>
    apiFetch<AdminUserPage>('/admin/users', { query: { cursor, limit } }),
  createUser: (email: string, password: string, role: 'admin' | 'user') =>
    apiFetch<AdminUser>('/admin/users', { method: 'POST', body: { email, password, role } }),
  updateUser: (id: number, patch: { role?: 'admin' | 'user'; isActive?: boolean }) =>
    apiFetch<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: patch }),
};
