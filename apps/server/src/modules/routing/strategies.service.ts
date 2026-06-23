import { Injectable, NotFoundException } from '@nestjs/common';
import { RoutingStrategyRepository } from './routing-strategy.repository.js';
import type { StrategyType } from './types/routing-candidate.js';
import { routingStrategies } from '../../database/index.js';

/** A single ordered position in a strategy's model order. */
export interface StrategyModelOrderEntry {
  userModelId: number;
  position: number;
  enabled: boolean;
}

/** A strategy view with its config parsed back into an object and its saved model order. */
export interface StrategyView {
  id: number;
  type: string;
  name: string;
  config: Record<string, unknown>;
  isDefault: boolean;
  /** Saved model order positions (empty array when none saved). */
  modelOrder: StrategyModelOrderEntry[];
}

/** Strategy management (TASK-046): list/create/update, reorder, config, and default selection. */
@Injectable()
export class StrategiesService {
  constructor(private readonly repository: RoutingStrategyRepository) {}

  /** Lists the user's strategies with their saved model order. */
  async list(userId: number): Promise<StrategyView[]> {
    const rows = await this.repository.listByUser(userId);
    return Promise.all(rows.map((row) => this.toView(row)));
  }

  /** Creates a strategy (config defaults to `{}`). */
  async create(
    userId: number,
    input: { type: StrategyType; name: string; config?: Record<string, unknown> },
  ): Promise<StrategyView> {
    const row = await this.repository.createForUser(
      userId,
      input.type,
      input.name,
      JSON.stringify(input.config ?? {}),
    );
    return this.toView(row);
  }

  /** Updates a strategy's name and/or config. */
  async update(
    userId: number,
    id: number,
    patch: { name?: string; config?: Record<string, unknown> },
  ): Promise<StrategyView> {
    const updated = await this.repository.updateOwned(userId, id, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.config !== undefined ? { config: JSON.stringify(patch.config) } : {}),
    });
    if (!updated) {
      throw new NotFoundException('Strategy not found');
    }
    return this.toView(updated);
  }

  /** Replaces just the strategy config. */
  updateConfig(userId: number, id: number, config: Record<string, unknown>): Promise<StrategyView> {
    return this.update(userId, id, { config });
  }

  /** Replaces a strategy's saved model order. */
  async setOrder(
    userId: number,
    id: number,
    items: { userModelId: number; position: number; enabled?: boolean }[],
  ): Promise<{ updated: number }> {
    if (!(await this.repository.replaceOrder(userId, id, items))) {
      throw new NotFoundException('Strategy not found');
    }
    return { updated: items.length };
  }

  /** Sets the user's default strategy (unsetting the previous default). */
  async setDefault(userId: number, id: number): Promise<{ default: number }> {
    if (!(await this.repository.setDefault(userId, id))) {
      throw new NotFoundException('Strategy not found');
    }
    return { default: id };
  }

  /** Maps a stored row to a view, parsing the JSON config and loading the saved model order. */
  private async toView(row: typeof routingStrategies.$inferSelect): Promise<StrategyView> {
    const positions = await this.repository.loadPositions(row.id);
    const modelOrder: StrategyModelOrderEntry[] = [];
    for (const [userModelId, position] of positions) {
      modelOrder.push({ userModelId, position, enabled: true });
    }
    // Sort by position so the client receives them in order
    modelOrder.sort((a, b) => a.position - b.position);
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      config: JSON.parse(row.config) as Record<string, unknown>,
      isDefault: row.isDefault,
      modelOrder,
    };
  }
}
