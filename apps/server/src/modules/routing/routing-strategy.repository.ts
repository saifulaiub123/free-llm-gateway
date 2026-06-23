import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { routingStrategies, strategyModelOrder, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';
import type { StrategyConfig, StrategyType } from './types/routing-candidate.js';

/** A strategy resolved for routing: its type, parsed config, and saved manual order positions. */
export interface ResolvedStrategy {
  type: StrategyType;
  config: StrategyConfig;
  positionByUserModelId: Map<number, number>;
}

/** Persistence for `routing_strategies` (+ its per-strategy `strategy_model_order`). */
@Injectable()
export class RoutingStrategyRepository extends BaseRepository<typeof routingStrategies> {
  constructor(database: DatabaseService) {
    super(database, routingStrategies, true); // composes baseEntityColumns -> soft-deletable
  }

  /**
   * Resolves the strategy to route with: the user's strategy of `type`, else their default, else a
   * synthesized config so routing always has something to order with. Also loads the saved positions
   * for `Manual.fixed`.
   */
  async resolveForUser(userId: number, type: string): Promise<ResolvedStrategy> {
    const row = (await this.findByUserAndType(userId, type)) ?? (await this.findDefault(userId));
    const effectiveType = (row?.type ?? type) as StrategyType;
    const config = row ? (JSON.parse(row.config) as StrategyConfig) : {};
    const positionByUserModelId = row ? await this.loadPositions(row.id) : new Map<number, number>();
    return { type: effectiveType, config, positionByUserModelId };
  }

  /** The user's strategy of a given type (non-deleted), or `undefined`. */
  async findByUserAndType(
    userId: number,
    type: string,
  ): Promise<typeof routingStrategies.$inferSelect | undefined> {
    const rows = await this.exec()
      .select()
      .from(routingStrategies)
      .where(
        and(
          this.scopedToUser(userId),
          eq(routingStrategies.type, type as StrategyType),
          eq(routingStrategies.isDeleted, false),
        ),
      )
      .limit(1);
    return rows[0];
  }

  /** The user's default strategy, or `undefined`. */
  async findDefault(userId: number): Promise<typeof routingStrategies.$inferSelect | undefined> {
    const rows = await this.exec()
      .select()
      .from(routingStrategies)
      .where(
        and(
          this.scopedToUser(userId),
          eq(routingStrategies.isDefault, true),
          eq(routingStrategies.isDeleted, false),
        ),
      )
      .limit(1);
    return rows[0];
  }

  /** Loads the saved `userModelId → position` map for a strategy. */
  async loadPositions(strategyId: number): Promise<Map<number, number>> {
    const rows = await this.exec()
      .select({ userModelId: strategyModelOrder.userModelId, position: strategyModelOrder.position })
      .from(strategyModelOrder)
      .where(eq(strategyModelOrder.strategyId, strategyId));
    return new Map(rows.map((row) => [row.userModelId, row.position]));
  }

  /** Lists the user's (non-deleted) strategies. */
  listByUser(userId: number): Promise<(typeof routingStrategies.$inferSelect)[]> {
    return this.findAll(this.scopedToUser(userId));
  }

  /** Finds one of the user's strategies by id (scoped, non-deleted), or `undefined`. */
  async findOwned(
    userId: number,
    id: number,
  ): Promise<typeof routingStrategies.$inferSelect | undefined> {
    const rows = await this.exec()
      .select()
      .from(routingStrategies)
      .where(
        and(
          eq(routingStrategies.id, id),
          this.scopedToUser(userId),
          eq(routingStrategies.isDeleted, false),
        ),
      )
      .limit(1);
    return rows[0];
  }

  /** Creates a strategy for the user (config is a JSON-encoded string). */
  async createForUser(
    userId: number,
    type: StrategyType,
    name: string,
    config: string,
  ): Promise<typeof routingStrategies.$inferSelect> {
    const rows = await this.exec()
      .insert(routingStrategies)
      .values({ userId, type, name, config })
      .returning();
    return rows[0]!;
  }

  /** Updates `name`/`config` on one of the user's strategies; returns the new row or `undefined`. */
  async updateOwned(
    userId: number,
    id: number,
    patch: { name?: string; config?: string },
  ): Promise<typeof routingStrategies.$inferSelect | undefined> {
    if (!(await this.findOwned(userId, id))) {
      return undefined;
    }
    const rows = await this.exec()
      .update(routingStrategies)
      .set({ ...patch, modifiedAt: new Date() })
      .where(eq(routingStrategies.id, id))
      .returning();
    return rows[0];
  }

  /**
   * Makes a strategy the user's default, unsetting the previous default in one transaction.
   * Returns false when the strategy is not the user's.
   */
  async setDefault(userId: number, id: number): Promise<boolean> {
    if (!(await this.findOwned(userId, id))) {
      return false;
    }
    await this.database.db.transaction(async (tx) => {
      await tx
        .update(routingStrategies)
        .set({ isDefault: false, modifiedAt: new Date() })
        .where(and(this.scopedToUser(userId), eq(routingStrategies.isDefault, true)));
      await tx
        .update(routingStrategies)
        .set({ isDefault: true, modifiedAt: new Date() })
        .where(eq(routingStrategies.id, id));
    });
    return true;
  }

  /**
   * Replaces a strategy's saved model order (drag reorder) in one transaction. Returns false when the
   * strategy is not the user's.
   */
  async replaceOrder(
    userId: number,
    strategyId: number,
    items: { userModelId: number; position: number; enabled?: boolean }[],
  ): Promise<boolean> {
    if (!(await this.findOwned(userId, strategyId))) {
      return false;
    }
    await this.database.db.transaction(async (tx) => {
      await tx.delete(strategyModelOrder).where(eq(strategyModelOrder.strategyId, strategyId));
      if (items.length > 0) {
        await tx.insert(strategyModelOrder).values(
          items.map((item) => ({
            strategyId,
            userModelId: item.userModelId,
            position: item.position,
            enabled: item.enabled ?? true,
          })),
        );
      }
    });
    return true;
  }
}
