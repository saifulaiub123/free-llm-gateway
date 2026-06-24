import { Injectable } from '@nestjs/common';
import { SQL, and, eq, count, getTableColumns } from 'drizzle-orm';
import { userModels, models, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';
import { FilterBuilder } from '../../common/pipes/filter-builder.js';
import { SortBuilder } from '../../common/pipes/sort-builder.js';
import { modelFilterConfig, modelSortableColumns } from './dto/model-query.schema.js';
import type { ModelQuery } from './dto/model-query.schema.js';
import type { Page } from '../../common/pipes/query.types.js';
import type { SavedModel } from './model.repository.js';
import type { InferSelectModel } from 'drizzle-orm';

type UserModelRow = InferSelectModel<typeof userModels>;

/** Persistence for per-user model state (enable/disable + custom models). */
@Injectable()
export class UserModelRepository extends BaseRepository<typeof userModels> {
  constructor(database: DatabaseService) {
    super(database, userModels, true); // composes baseEntityColumns -> soft-deletable
  }

  /**
   * Columns on the `models` table that need a LEFT JOIN when referenced in filter/sort.
   */
  private static readonly MODELS_JOIN_COLUMNS = [
    'providerId', 'isFree', 'displayName', 'speedTier',
    'intelligenceScore', 'inputCostPer1m', 'outputCostPer1m',
    'contextWindow', 'stabilityBaseline',
  ];

  /**
   * Paginated, filtered, sorted query of user_models for a given user.
   *
   * Steps:
   * 1. Always apply mandatory predicates: `userId = :userId` and `isDeleted = false`
   * 2. If filter provided, use FilterBuilder to add column/operator predicates
   *    (LEFT JOINs models table for fields like displayName, isFree, providerId)
   * 3. Sort via SortBuilder (default desc(id))
   * 4. Apply OFFSET = (page - 1) * per_page and LIMIT = per_page
   * 5. Run a COUNT(*) query (with same predicates) to compute total
   *
   * WHY a dedicated page method vs the generic BaseRepository.findAll:
   * the dynamic WHERE/ORDER/JOIN complexity is specific to this endpoint. A generic
   * findAllPage would need the same FilterBuilder/SortBuilder composition anyway.
   */
  async listByUserPage(
    userId: number,
    query: ModelQuery,
  ): Promise<Page<UserModelRow>> {
    const predicates: SQL[] = [
      eq(userModels.userId, userId),
      eq(userModels.isDeleted, false),
    ];

    // Determine whether a JOIN with the models table is needed
    const needsModelsJoin =
      query.filter != null &&
      Object.keys(query.filter).some((k) =>
        UserModelRepository.MODELS_JOIN_COLUMNS.includes(k),
      );

    // Dynamic filter — validated against modelFilterConfig
    if (query.filter) {
      const joinTable = needsModelsJoin ? models : undefined;
      predicates.push(
        ...FilterBuilder.build(userModels, query.filter, modelFilterConfig, joinTable),
      );
    }

    // Sort — validated against modelSortableColumns
    const orderBy = SortBuilder.build(userModels, query.sort, modelSortableColumns);

    // Compute OFFSET
    const offset = (query.page - 1) * query.per_page;

    // ── COUNT(*) query (same predicates, no limit/offset) ──
    // Split into two branches to avoid leftJoin changing the query builder type.
    const [countResult] = needsModelsJoin
      ? await this.exec()
          .select({ total: count() })
          .from(userModels)
          .leftJoin(models, eq(userModels.modelId, models.id))
          .where(and(...predicates))
      : await this.exec()
          .select({ total: count() })
          .from(userModels)
          .where(and(...predicates));
    const total = countResult?.total ?? 0;

    // ── Data query ──
    // Same split: with or without LEFT JOIN. Using `.map()` to extract only
    // user_models columns from the joined result if needed.
    const items: UserModelRow[] = needsModelsJoin
      ? await this.exec()
          .select(getTableColumns(userModels))
          .from(userModels)
          .leftJoin(models, eq(userModels.modelId, models.id))
          .where(and(...predicates))
          .orderBy(...orderBy)
          .limit(query.per_page)
          .offset(offset)
          .then((rows) => rows as unknown as UserModelRow[])
      : await this.exec()
          .select(getTableColumns(userModels))
          .from(userModels)
          .where(and(...predicates))
          .orderBy(...orderBy)
          .limit(query.per_page)
          .offset(offset);

    return { items, page: query.page, perPage: query.per_page, total };
  }

  /**
   * Ensures a `user_models` row exists for each freshly-saved catalog model, enabling free models by
   * default (the free-first promise). Existing rows are left untouched, so a re-fetch never clobbers
   * a user's manual enable/disable choices.
   *
   * @param providerKeyId - The stored key that discovered these models (KSM-001). Null for legacy
   *   or unkeyed flows. When set, the existence check scopes by `(userId, providerKeyId, modelId)`
   *   so multiple keys for the same provider each get their own user_models row.
   */
  async ensureRows(userId: number, savedModels: SavedModel[], providerKeyId?: number | null): Promise<void> {
    for (const model of savedModels) {
      if (!(await this.hasRowForModel(userId, model.id, providerKeyId ?? null))) {
        await this.exec().insert(userModels).values({
          userId,
          modelId: model.id,
          providerKeyId: providerKeyId ?? null,
          enabled: model.isFree, // free-by-default
          isCustom: false,
        });
      }
    }
  }

  /**
   * Whether the user already has a (non-deleted) row for a catalog model.
   *
   * When `providerKeyId` is non-null, the check is key-scoped so the same upstream model can
   * have a separate row per provider key/account. When null, it falls back to the legacy
   * scoping `(userId, modelId)` for backward compatibility.
   */
  private async hasRowForModel(userId: number, modelId: number, providerKeyId: number | null): Promise<boolean> {
    const conditions = [
      this.scopedToUser(userId),
      eq(userModels.modelId, modelId),
      eq(userModels.isDeleted, false),
    ];
    if (providerKeyId !== null) {
      conditions.push(eq(userModels.providerKeyId, providerKeyId));
    }
    const rows = await this.exec()
      .select({ id: userModels.id })
      .from(userModels)
      .where(and(...conditions))
      .limit(1);
    return rows.length > 0;
  }

  /** Lists a user's (non-deleted) model rows. */
  listByUser(userId: number): Promise<(typeof userModels.$inferSelect)[]> {
    return this.findAll(this.scopedToUser(userId));
  }

  /** Finds one of the user's rows by id (scoped, non-deleted), or `undefined`. */
  async findOwned(
    userId: number,
    id: number,
  ): Promise<typeof userModels.$inferSelect | undefined> {
    const rows = await this.exec()
      .select()
      .from(userModels)
      .where(
        and(eq(userModels.id, id), this.scopedToUser(userId), eq(userModels.isDeleted, false)),
      )
      .limit(1);
    return rows[0];
  }

  /** Updates `enabled`/`overrides` on one of the user's rows; returns the new row or `undefined`. */
  async updateOwned(
    userId: number,
    id: number,
    patch: { enabled?: boolean; overrides?: string | null },
  ): Promise<typeof userModels.$inferSelect | undefined> {
    if (!(await this.findOwned(userId, id))) {
      return undefined;
    }
    const rows = await this.exec()
      .update(userModels)
      .set({ ...patch, modifiedAt: new Date() })
      .where(eq(userModels.id, id))
      .returning();
    return rows[0];
  }

  /** Inserts a fully-custom user model row and returns it. */
  async createCustom(
    values: typeof userModels.$inferInsert,
  ): Promise<typeof userModels.$inferSelect> {
    const rows = await this.exec().insert(userModels).values(values).returning();
    return rows[0]!;
  }

  /** Soft-deletes one of the user's CUSTOM rows; returns whether a matching row was removed. */
  async removeCustomOwned(userId: number, id: number): Promise<boolean> {
    const rows = await this.exec()
      .update(userModels)
      .set({ isDeleted: true, modifiedAt: new Date() })
      .where(
        and(
          eq(userModels.id, id),
          this.scopedToUser(userId),
          eq(userModels.isCustom, true),
          eq(userModels.isDeleted, false),
        ),
      )
      .returning({ id: userModels.id });
    return rows.length > 0;
  }

  /**
   * Soft-deletes all non-custom model rows associated with a provider key.
   *
   * WHY non-custom only: custom models are user-created and should survive key removal.
   * If a custom model was explicitly linked to a key, the caller can still reference it
   * or the FK `ON DELETE SET NULL` will nullify the link.
   *
   * Called from ProvidersService.removeKey() to avoid stale key-scoped rows (KSM-009).
   */
  async removeByProviderKey(userId: number, providerKeyId: number): Promise<void> {
    await this.exec()
      .update(userModels)
      .set({ isDeleted: true, modifiedAt: new Date() })
      .where(
        and(
          eq(userModels.providerKeyId, providerKeyId),
          this.scopedToUser(userId),
          eq(userModels.isCustom, false),
          eq(userModels.isDeleted, false),
        ),
      );
  }
}
