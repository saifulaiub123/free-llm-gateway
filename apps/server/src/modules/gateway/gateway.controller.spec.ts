import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import type { ChatRequest } from '@gateway/provider-adapters';
import { GatewayController } from './gateway.controller.js';
import type { GatewayService } from './gateway.service.js';
import type { FallbackExecutor, ExecutionResult } from './fallback-executor.js';
import type { ModelsService } from '../models/models.service.js';
import type { CurrentUser } from '../auth/auth.types.js';

const USER: CurrentUser = { id: 7, role: 'user' };
const BODY = { model: 'auto', messages: [{ role: 'user', content: 'hi' }] } as unknown as ChatRequest;

function build(result: ExecutionResult) {
  const chain = [{ providerKey: 'groq', modelId: 1 }];
  const buildChain = vi.fn().mockResolvedValue(chain);
  const gateway = { buildChain } as unknown as GatewayService;
  const execute = vi.fn().mockResolvedValue(result);
  const executor = { execute } as unknown as FallbackExecutor;
  const controller = new GatewayController({} as unknown as ModelsService, gateway, executor);
  const res = { setHeader: vi.fn(), json: vi.fn() } as unknown as Response;
  return { controller, res, buildChain, execute, chain };
}

describe('GatewayController.chat', () => {
  it('routes a non-streaming completion and emits X-Routed-Via with the upstream JSON', async () => {
    const response = { id: 'chatcmpl-1', object: 'chat.completion' };
    const { controller, res, buildChain, execute, chain } = build({
      response: response as never,
      routedVia: 'groq/llama-3.3-70b',
      attempts: 0,
    });

    await controller.chat(USER, BODY, undefined, res);

    expect(buildChain).toHaveBeenCalledWith(7, BODY, undefined);
    expect(execute).toHaveBeenCalledWith(7, chain, BODY);
    expect(res.setHeader).toHaveBeenCalledWith('X-Routed-Via', 'groq/llama-3.3-70b');
    expect(res.setHeader).not.toHaveBeenCalledWith('X-Fallback-Attempts', expect.anything());
    expect(res.json).toHaveBeenCalledWith(response);
  });

  it('emits X-Fallback-Attempts when fallback occurred', async () => {
    const { controller, res } = build({
      response: { id: 'x' } as never,
      routedVia: 'groq/b',
      attempts: 2,
    });

    await controller.chat(USER, BODY, 'fastest', res);

    expect(res.setHeader).toHaveBeenCalledWith('X-Fallback-Attempts', '2');
  });
});
