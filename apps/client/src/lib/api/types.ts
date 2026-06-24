/**
 * Client-side mirrors of the management API (`/api/v1`) payloads — the value INSIDE the server's
 * `{ data: ... }` envelope. Kept here (not in `@gateway/shared-types`) so the client stays decoupled
 * from the server's NestJS DTO classes while still being fully typed.
 */

/** Access + rotating refresh token pair returned by every auth endpoint. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** The decoded JWT principal the client keeps in memory. */
export interface Principal {
  id: number;
  role: string;
}

/** A created LLM API token — plaintext is shown exactly once. */
export interface CreatedToken {
  token: string;
  prefix: string;
}

/** Metadata for a stored LLM API token (never the plaintext). */
export interface ApiTokenMetadata {
  id: number;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revoked: boolean;
  createdAt: string;
}

/** A provider in the global catalog. */
export interface Provider {
  id: number;
  key: string;
  displayName: string;
  baseUrl: string;
  adapterType: string;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsEmbeddings: boolean;
}

/** Health of a stored provider key. */
export type KeyStatus = 'healthy' | 'rate_limited' | 'invalid' | 'error';

/** Metadata for a stored provider key (never the ciphertext). */
export interface ProviderKey {
  id: number;
  providerId: number;
  label: string | null;
  status: KeyStatus;
  lastCheckedAt: string | null;
  createdAt: string;
}

/** Result of an on-demand model fetch for a key. */
export interface FetchModelsResult {
  fetched: number;
  free: number;
}

/** A user's view of a catalog or custom model. */
export interface ModelView {
  userModelId: number;
  modelId: string;
  displayName: string;
  providerId: number | null;
  providerKeyId: number | null;
  providerKeyLabel: string | null;
  enabled: boolean;
  isCustom: boolean;
  isFree: boolean;
  intelligenceScore: number;
  speedTier: string;
  inputCostPer1m: number;
  outputCostPer1m: number;
  contextWindow: number | null;
  capabilities: Record<string, boolean>;
}

/** The routing strategy kinds. */
export type StrategyType = 'manual' | 'free_first' | 'balanced' | 'fastest' | 'smart';

/** One entry in a strategy's saved model order. */
export interface StrategyModelOrderEntry {
  userModelId: number;
  position: number;
  enabled: boolean;
}

/** A user's routing strategy. */
export interface StrategyView {
  id: number;
  type: StrategyType;
  name: string;
  config: Record<string, unknown>;
  isDefault: boolean;
  /** Saved model order positions (empty array when none saved). */
  modelOrder: StrategyModelOrderEntry[];
}

/** One reorder entry for a strategy's model order. */
export interface ReorderItem {
  userModelId: number;
  position: number;
  enabled?: boolean;
}

/** Aggregated usage summary for an analytics window. */
export interface UsageSummary {
  window: string;
  requests: number;
  successRate: number;
  avgLatencyMs: number;
  totalTokens: number;
  totalCostSaved: number;
}

/** Per-provider usage breakdown row. */
export interface ProviderUsageRow {
  provider: string | null;
  requests: number;
  successes: number;
  avgLatencyMs: number;
  totalCostSaved: number;
}

/** One persisted `/v1` call log row. */
export interface RequestLog {
  id: number;
  userId: number;
  strategyId: number | null;
  requestedModel: string;
  routedProvider: string | null;
  routedModel: string | null;
  /** Display name from the models catalog (e.g. "Gemini 2.0 Flash"), or null if not resolved. */
  routedModelDisplay: string | null;
  fallbackAttempts: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
  costSaved: number;
  status: string;
  createdAt: string;
}

/** One page of request logs plus the next keyset cursor. */
export interface LogPage {
  items: RequestLog[];
  nextCursor: number | null;
}

/** Supported analytics windows. */
export type AnalyticsWindow = '24h' | '7d' | '30d';

/** Whether public self-registration is open and whether any account exists yet. */
export interface RegistrationStatus {
  registrationEnabled: boolean;
  hasUsers: boolean;
}

/** A global setting plus its registry metadata (drives the admin settings form). */
export interface GlobalSetting {
  key: string;
  value: unknown;
  default: unknown;
  adminOnly: boolean;
  description: string;
}

/** A user row for the admin list (never the password hash). */
export interface AdminUser {
  id: number;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

/** One page of admin users plus the next keyset cursor. */
export interface AdminUserPage {
  items: AdminUser[];
  nextCursor: number | null;
}

// ── Queryable models (pagination/filter/sort) ────────────────────────

/** A paginated page of models. */
export interface ModelPage {
  items: ModelView[];
  page: number;
  perPage: number;
  total: number;
}

/** Column operator config — mirrors server's FilterColumnInfoDto. */
export interface FilterColumnInfo {
  field: string;
  operators: string[];
}

/** Sortable column config. */
export interface SortColumnInfo {
  field: string;
  defaultDirection: string;
}

/** Response from GET /api/v1/models/query-config. */
export interface ModelQueryInfo {
  filterableColumns: FilterColumnInfo[];
  sortableColumns: SortColumnInfo[];
  defaultPage: number;
  defaultPerPage: number;
  maxPerPage: number;
}
