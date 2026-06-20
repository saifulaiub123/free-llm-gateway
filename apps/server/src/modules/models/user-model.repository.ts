import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { userModels, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';
import type { SavedModel } from './model.repository.js';

/** Persistence for per-user model state (enable/disable + custom models). */
@Injectable()
export class UserModelRepository extends BaseRepository<typeof userModels> {
  constructor(database: DatabaseService) {
    super(database, userModels, true); // composes baseEntityColumns -> soft-deletable
  }

  /**
   * Ensures a `user_models` row exists for each freshly-saved catalog model, enabling free models by
   * default (the free-first promise). Existing rows are left untouched, so a re-fetch never clobbers
   * a user's manual enable/disable choices.
   */
  async ensureRows(userId: number, savedModels: SavedModel[]): Promise<void> {
    for (const model of savedModels) {
      if (!(await this.hasRowForModel(userId, model.id))) {
        await this.exec().insert(userModels).values({
          userId,
          modelId: model.id,
          enabled: model.isFree, // free-by-default
          isCustom: false,
        });
      }
    }
  }

  /** Whether the user already has a (non-deleted) row for a catalog model. */
  private async hasRowForModel(userId: number, modelId: number): Promise<boolean> {
    const rows = await this.exec()
      .select({ id: userModels.id })
      .from(userModels)
      .where(
        and(
          this.scopedToUser(userId),
          eq(userModels.modelId, modelId),
          eq(userModels.isDeleted, false),
        ),
      )
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
}
