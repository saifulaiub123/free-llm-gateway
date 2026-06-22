import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { ChatRequest } from '@gateway/provider-adapters';
import { GatewayService } from './gateway.service.js';
import type { RoutingService } from '../routing/routing.service.js';
import type { RoutingStrategyRepository } from '../routing/routing-strategy.repository.js';

function build(defaultType?: string) {
  const buildChain = vi.fn().mockResolvedValue([]);
  const routing = { buildChain } as unknown as RoutingService;
  const findDefault = vi.fn().mockResolvedValue(defaultType ? { type: defaultType } : undefined);
  const strategies = { findDefault } as unknown as RoutingStrategyRepository;
  return { service: new GatewayService(routing, strategies), buildChain };
}

const req = (overrides: Record<string, unknown>): ChatRequest =>
  ({ model: 'auto', messages: [{ role: 'user', content: 'hi' }], ...overrides }) as unknown as ChatRequest;

describe('GatewayService', () => {
  it('resolveStrategyType: header wins, else user default, else balanced', async () => {
    expect(await build('smart').service.resolveStrategyType(1, 'fastest')).toBe('fastest');
    expect(await build('smart').service.resolveStrategyType(1)).toBe('smart');
    expect(await build().service.resolveStrategyType(1)).toBe('balanced');
  });

  it('capsOf derives vision (image content), tools, and json mode', () => {
    const { service } = build();
    expect(service.capsOf(req({ tools: [{}] }))).toMatchObject({ tools: true, vision: false, json: false });
    expect(
      service.capsOf(req({ messages: [{ role: 'user', content: [{ type: 'image_url' }] }] })),
    ).toMatchObject({ vision: true });
    expect(service.capsOf(req({ response_format: { type: 'json_object' } }))).toMatchObject({
      json: true,
    });
  });

  it('buildChain delegates with the resolved strategy + derived caps', async () => {
    const { service, buildChain } = build('balanced');
    await service.buildChain(7, req({ tools: [{}] }), 'smart');
    expect(buildChain).toHaveBeenCalledWith(7, 'auto', 'smart', expect.objectContaining({ tools: true }));
  });

  it('buildChain rejects a request missing model/messages (400)', async () => {
    const { service } = build();
    await expect(
      service.buildChain(7, { messages: [] } as unknown as ChatRequest),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
