import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { models, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';
import type { ModelUpsertRow } from './model-metadata.service.js';

/** The minimal saved-model shape returned to the service after an upsert. */
export interface SavedModel {
  id: number;
  modelId: string;
  isFree: boolean;
}

/** Persistence for the shared `models` catalog (provider-scoped, populated on demand). */
@Injectable()
export class ModelRepository extends BaseRepository<typeof models> {
  constructor(database: DatabaseService) {
    super(database, models, false); // catalog composes baseColumns only
  }

  /** Finds a catalog model by `(provider_id, model_id)`, or `undefined`. */
  async findByProviderAndModelId(
    providerId: number,
    modelId: string,
  ): Promise<typeof models.$inferSelect | undefined> {
    const rows = await this.exec()
      .select()
      .from(models)
      .where(and(eq(models.providerId, providerId), eq(models.modelId, modelId)))
      .limit(1);
    return rows[0];
  }

  /**
   * Upserts discovered models by `(provider_id, model_id)` (app-level upsert keeps it cross-driver).
   *
   * `capabilities` is JSON-encoded on write. Returns the saved rows' id/modelId/isFree for the
   * per-user enable step.
   */
  async upsertMany(providerId: number, rows: ModelUpsertRow[]): Promise<SavedModel[]> {
    const saved: SavedModel[] = [];
    for (const row of rows) {
      const values = {
        providerId,
        modelId: row.modelId,
        displayName: row.displayName,
        isFree: row.isFree,
        intelligenceScore: row.intelligenceScore,
        speedTier: row.speedTier,
        inputCostPer1m: row.inputCostPer1m,
        outputCostPer1m: row.outputCostPer1m,
        contextWindow: row.contextWindow,
        capabilities: JSON.stringify(row.capabilities),
        stabilityBaseline: row.stabilityBaseline,
      };
      const existing = await this.findByProviderAndModelId(providerId, row.modelId);
      const result = existing
        ? await this.exec().update(models).set(values).where(eq(models.id, existing.id)).returning()
        : await this.exec().insert(models).values(values).returning();
      const persisted = result[0]!;
      saved.push({ id: persisted.id, modelId: persisted.modelId, isFree: persisted.isFree });
    }
    return saved;
  }

  /** Loads catalog models by their ids (for building a user's model view). */
  async findByIds(ids: number[]): Promise<(typeof models.$inferSelect)[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.exec().select().from(models).where(inArray(models.id, ids));
  }
}
