import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { StrategiesService } from './strategies.service.js';
import type { RoutingStrategyRepository } from './routing-strategy.repository.js';

function build(
  overrides: {
    updateOwned?: unknown;
    replaceOrder?: boolean;
    setDefault?: boolean;
  } = {},
) {
  const createForUser = vi
    .fn()
    .mockResolvedValue({ id: 1, type: 'balanced', name: 'A', config: '{"weights":{}}', isDefault: false });
  const listByUser = vi
    .fn()
    .mockResolvedValue([{ id: 1, type: 'balanced', name: 'A', config: '{}', isDefault: true }]);
  const updateOwned = vi
    .fn()
    .mockResolvedValue(
      'updateOwned' in overrides
        ? overrides.updateOwned
        : { id: 1, type: 'balanced', name: 'B', config: '{}', isDefault: false },
    );
  const loadPositions = vi.fn().mockResolvedValue(new Map<number, number>());
  const replaceOrder = vi.fn().mockResolvedValue(overrides.replaceOrder ?? true);
  const setDefault = vi.fn().mockResolvedValue(overrides.setDefault ?? true);
  const repository = {
    createForUser,
    listByUser,
    updateOwned,
    loadPositions,
    replaceOrder,
    setDefault,
  } as unknown as RoutingStrategyRepository;
  return { service: new StrategiesService(repository), createForUser, updateOwned, replaceOrder, setDefault };
}

describe('StrategiesService', () => {
  it('creates a strategy, JSON-encoding the config and returning a parsed view', async () => {
    const { service, createForUser } = build();
    const view = await service.create(7, { type: 'balanced', name: 'A', config: { weights: {} } });
    expect(createForUser).toHaveBeenCalledWith(7, 'balanced', 'A', JSON.stringify({ weights: {} }));
    expect(view.config).toEqual({ weights: {} }); // parsed back
  });

  it('lists strategies with config parsed', async () => {
    const { service } = build();
    const [view] = await service.list(7);
    expect(view!.config).toEqual({});
    expect(view!.isDefault).toBe(true);
  });

  it('throws 404 when updating a strategy the caller does not own', async () => {
    const { service } = build({ updateOwned: undefined });
    await expect(service.update(7, 1, { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reorders and reports the count; 404 when not owned', async () => {
    const ok = build();
    expect(await ok.service.setOrder(7, 1, [{ userModelId: 10, position: 0 }])).toEqual({ updated: 1 });
    const missing = build({ replaceOrder: false });
    await expect(missing.service.setOrder(7, 1, [])).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sets default; 404 when not owned', async () => {
    expect(await build().service.setDefault(7, 1)).toEqual({ default: 1 });
    await expect(build({ setDefault: false }).service.setDefault(7, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
