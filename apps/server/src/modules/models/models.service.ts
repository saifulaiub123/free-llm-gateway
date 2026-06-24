import { Injectable, NotFoundException } from '@nestjs/common';
import { AdapterRegistry, type ModelCapabilities } from '@gateway/provider-adapters';
import { EncryptionService } from '../../common/crypto/encryption.service.js';
import { UserProviderKeyRepository } from '../providers/user-provider-key.repository.js';
import { ProviderRepository } from '../providers/provider.repository.js';
import { ModelRepository } from './model.repository.js';
import { UserModelRepository } from './user-model.repository.js';
import { ModelMetadataService } from './model-metadata.service.js';
import { models as modelsTable, userModels as userModelsTable } from '../../database/index.js';
import type { Page } from '../../common/pipes/query.types.js';
import type { ModelQuery } from './dto/model-query.schema.js';

/** Result of a fetch-models run: total models persisted and how many are free. */
export interface FetchModelsResult {
  fetched: number;
  free: number;
}

/** A unified view of a user's model (catalog or custom) for the dashboard. */
export interface ModelView {
  userModelId: number;
  modelId: string;
  displayName: string;
  providerId: number | null;
  /** The stored provider key that discovered this model (KSM-003). Null for legacy/custom rows. */
  providerKeyId: number | null;
  /** The label of the provider key, e.g. "personal" or "work" (KSM-005). Null when unkeyed. */
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

/** Default capability flags for a custom model when none are supplied. */
const DEFAULT_CAPABILITIES: ModelCapabilities = {
  vision: false,
  tools: false,
  json: true,
  reasoning: false,
  embeddings: false,
};

/** Orchestrates on-demand model discovery + the per-user model catalog (TASK-030/031). */
@Injectable()
export class ModelsService {
  constructor(
    private readonly registry: AdapterRegistry,
    private readonly encryption: EncryptionService,
    private readonly keys: UserProviderKeyRepository,
    private readonly models: ModelRepository,
    private readonly userModels: UserModelRepository,
    private readonly metadata: ModelMetadataService,
    private readonly catalog: ProviderRepository,
  ) {}

  /**
   * Discovers a provider's models for a user's key and upserts them, enabling free ones by default.
   *
   * WHY enable-free-by-default: the product's promise is free-first usage, so a new key should be
   * immediately useful without manual toggling. The plaintext key is decrypted only in memory here.
   */
  async fetchModelsForKey(userId: number, keyId: number): Promise<FetchModelsResult> {
    const key = await this.keys.getOwned(userId, keyId);
    if (!key) {
      throw new NotFoundException('Provider key not found');
    }
    const adapter = this.registry.get(key.adapterType);
    const discovered = adapter.classifyFreeModels(
      await adapter.fetchModels(this.encryption.decrypt(key.encryptedKey)),
    );
    const merged = this.metadata.applyBaseline(key.providerId, discovered);
    const saved = await this.models.upsertMany(key.providerId, merged);
    await this.userModels.ensureRows(userId, saved, key.id);
    return { fetched: saved.length, free: saved.filter((model) => model.isFree).length };
  }

  /** Returns the user's model catalog (catalog metadata + custom models) with the enabled flag. */
  async listForUser(userId: number): Promise<ModelView[]> {
    const rows = await this.userModels.listByUser(userId);
    const catalogIds = rows
      .filter((row) => row.modelId !== null)
      .map((row) => row.modelId as number);
    const catalog = await this.models.findByIds(catalogIds);
    const byId = new Map(catalog.map((model) => [model.id, model]));
    const keyLabelById = await this.buildKeyLabelMap(userId);
    return rows.map((row) =>
      row.isCustom
        ? this.toCustomView(row, keyLabelById)
        : this.toCatalogView(row, byId.get(row.modelId as number), keyLabelById),
    );
  }

  /** Returns the user's ENABLED models with their provider key, for the OpenAI `/v1/models` list. */
  async listEnabled(userId: number): Promise<{ modelId: string; providerKey: string }[]> {
    const enabled = (await this.listForUser(userId)).filter((view) => view.enabled);
    const providerKeyById = new Map(
      (await this.catalog.listAll()).map((provider) => [provider.id, provider.key]),
    );
    return enabled.map((view) => ({
      modelId: view.modelId,
      providerKey: view.providerId !== null ? (providerKeyById.get(view.providerId) ?? 'custom') : 'custom',
    }));
  }

  /**
   * Paginated, filtered, sorted version of `listForUser`.
   *
   * WHY keep both: `listForUser` is used by the OpenAI-compatible `/v1/models` gateway
   * endpoint (always-all, no pagination), while `listForUserPage` serves the management
   * API dashboard with dynamic query support. A single endpoint for both would break the
   * gateway contract.
   */
  async listForUserPage(userId: number, query: ModelQuery): Promise<Page<ModelView>> {
    const page = await this.userModels.listByUserPage(userId, query);
    const catalogIds = page.items
      .filter((row) => row.modelId !== null)
      .map((row) => row.modelId as number);
    const catalog =
      catalogIds.length > 0 ? await this.models.findByIds(catalogIds) : [];
    const byId = new Map(catalog.map((m) => [m.id, m]));
    const keyLabelById = await this.buildKeyLabelMap(userId);
    return {
      items: page.items.map((row) =>
        row.isCustom
          ? this.toCustomView(row, keyLabelById)
          : this.toCatalogView(row, byId.get(row.modelId as number), keyLabelById),
      ),
      page: page.page,
      perPage: page.perPage,
      total: page.total,
    };
  }

  /** Enables/disables a user model or sets overrides. Throws `404` when the row is not the caller's. */
  async updateUserModel(
    userId: number,
    userModelId: number,
    patch: { enabled?: boolean; overrides?: Record<string, unknown> },
  ): Promise<{ id: number; enabled: boolean }> {
    const updated = await this.userModels.updateOwned(userId, userModelId, {
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      ...(patch.overrides !== undefined ? { overrides: JSON.stringify(patch.overrides) } : {}),
    });
    if (!updated) {
      throw new NotFoundException('Model not found');
    }
    return { id: updated.id, enabled: updated.enabled };
  }

  /** Adds a fully-custom model under a provider. Throws `404` for an unknown provider key. */
  async addCustomModel(
    userId: number,
    input: {
      providerKey: string;
      modelId: string;
      displayName: string;
      inputCostPer1m?: number;
      outputCostPer1m?: number;
      capabilities?: Record<string, boolean>;
    },
  ): Promise<ModelView> {
    const provider = await this.catalog.getByKey(input.providerKey);
    if (!provider) {
      throw new NotFoundException(`Unknown provider "${input.providerKey}"`);
    }
    const overrides = {
      modelId: input.modelId,
      displayName: input.displayName,
      inputCostPer1m: input.inputCostPer1m ?? 0,
      outputCostPer1m: input.outputCostPer1m ?? 0,
      capabilities: input.capabilities ?? DEFAULT_CAPABILITIES,
    };
    const created = await this.userModels.createCustom({
      userId,
      customProviderId: provider.id,
      isCustom: true,
      enabled: true,
      overrides: JSON.stringify(overrides),
    });
    return this.toCustomView(created);
  }

  /** Removes one of the user's custom models; returns whether a matching row was removed. */
  removeCustomModel(userId: number, id: number): Promise<boolean> {
    return this.userModels.removeCustomOwned(userId, id);
  }

  /** Builds a map of keyId → label for the user's provider keys (KSM-003). */
  private async buildKeyLabelMap(userId: number): Promise<Map<number, string>> {
    const keys = await this.keys.listByUser(userId);
    return new Map(keys.map((k) => [k.id, k.label ?? `key ${k.id}`]));
  }

  /** Builds the view for a catalog-backed user model (applies any cost/capability overrides). */
  private toCatalogView(
    row: typeof userModelsTable.$inferSelect,
    model: typeof modelsTable.$inferSelect | undefined,
    keyLabelById: Map<number, string>,
  ): ModelView {
    if (!model) {
      // Defensive fallback: the user_models row references a catalog model that no longer exists.
      return {
        userModelId: row.id,
        modelId: 'unknown',
        displayName: 'unknown',
        providerId: null,
        providerKeyId: row.providerKeyId,
        providerKeyLabel: row.providerKeyId != null ? (keyLabelById.get(row.providerKeyId) ?? null) : null,
        enabled: row.enabled,
        isCustom: false,
        isFree: false,
        intelligenceScore: 0,
        speedTier: 'medium',
        inputCostPer1m: 0,
        outputCostPer1m: 0,
        contextWindow: null,
        capabilities: { ...DEFAULT_CAPABILITIES } as unknown as Record<string, boolean>,
      };
    }
    const overrides = this.parseOverrides(row.overrides);
    const capabilities =
      (overrides.capabilities as Record<string, boolean> | undefined) ??
      (this.parseCapabilities(model.capabilities) as unknown as Record<string, boolean>);
    return {
      userModelId: row.id,
      modelId: model.modelId,
      displayName: model.displayName,
      providerId: model.providerId,
      providerKeyId: row.providerKeyId,
      providerKeyLabel: row.providerKeyId != null ? (keyLabelById.get(row.providerKeyId) ?? null) : null,
      enabled: row.enabled,
      isCustom: false,
      isFree: model.isFree,
      intelligenceScore: model.intelligenceScore,
      speedTier: model.speedTier,
      inputCostPer1m: (overrides.inputCostPer1m as number | undefined) ?? model.inputCostPer1m,
      outputCostPer1m: (overrides.outputCostPer1m as number | undefined) ?? model.outputCostPer1m,
      contextWindow: model.contextWindow,
      capabilities,
    };
  }

  /** Builds the view for a fully-custom user model (details live in `overrides`). */
  private toCustomView(
    row: typeof userModelsTable.$inferSelect,
    keyLabelById: Map<number, string>,
  ): ModelView {
    const overrides = this.parseOverrides(row.overrides);
    return {
      userModelId: row.id,
      modelId: (overrides.modelId as string) ?? 'custom',
      displayName: (overrides.displayName as string) ?? 'Custom model',
      providerId: row.customProviderId,
      providerKeyId: row.providerKeyId,
      providerKeyLabel: row.providerKeyId != null ? (keyLabelById.get(row.providerKeyId) ?? null) : null,
      enabled: row.enabled,
      isCustom: true,
      isFree: true,
      intelligenceScore: 0,
      speedTier: 'medium',
      inputCostPer1m: (overrides.inputCostPer1m as number | undefined) ?? 0,
      outputCostPer1m: (overrides.outputCostPer1m as number | undefined) ?? 0,
      contextWindow: null,
      capabilities:
        (overrides.capabilities as Record<string, boolean> | undefined) ??
        ({ ...DEFAULT_CAPABILITIES } as unknown as Record<string, boolean>),
    };
  }

  /** Safely parses an overrides JSON string into an object. */
  private parseOverrides(value: string | null): Record<string, unknown> {
    if (!value) {
      return {};
    }
    return JSON.parse(value) as Record<string, unknown>;
  }

  /** Parses a stored JSON capabilities string. */
  private parseCapabilities(value: string): ModelCapabilities {
    return JSON.parse(value) as ModelCapabilities;
  }
}
