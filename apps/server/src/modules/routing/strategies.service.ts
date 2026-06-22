import { Injectable, NotFoundException } from '@nestjs/common';
import { RoutingStrategyRepository } from './routing-strategy.repository.js';
import type { StrategyType } from './types/routing-candidate.js';
import { routingStrategies } from '../../database/index.js';

/** A strategy view with its config parsed back into an object. */
export interface StrategyView {
  id: number;
  type: string;
  name: string;
  config: Record<string, unknown>;
  isDefault: boolean;
}

/** Strategy management (TASK-046): list/create/update, reorder, config, and default selection. */
@Injectable()
export class StrategiesService {
  constructor(private readonly repository: RoutingStrategyRepository) {}

  /** Lists the user's strategies. */
  async list(userId: number): Promise<StrategyView[]> {
    return (await this.repository.listByUser(userId)).map((row) => this.toView(row));
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

  /** Maps a stored row to a view, parsing the JSON config. */
  private toView(row: typeof routingStrategies.$inferSelect): StrategyView {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      config: JSON.parse(row.config) as Record<string, unknown>,
      isDefault: row.isDefault,
    };
  }
}
