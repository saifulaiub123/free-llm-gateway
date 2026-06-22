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
}
