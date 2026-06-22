import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import type { ChatRequest } from '@gateway/provider-adapters';
import { GatewayController } from './gateway.controller.js';
import type { GatewayService } from './gateway.service.js';
import type { FallbackExecutor, ExecutionResult } from './fallback-executor.js';
import type { ModelsService } from '../models/models.service.js';
import type { RequestLoggingService } from '../analytics/request-logging.service.js';
import type { CurrentUser } from '../auth/auth.types.js';

const USER: CurrentUser = { id: 7, role: 'user' };
const BODY = { model: 'auto', messages: [{ role: 'user', content: 'hi' }] } as unknown as ChatRequest;

function build(result: ExecutionResult) {
  const chain = [{ providerKey: 'groq', modelId: 1 }];
  const buildChain = vi.fn().mockResolvedValue(chain);
  const gateway = { buildChain } as unknown as GatewayService;
  const execute = vi.fn().mockResolvedValue(result);
  const executor = { execute } as unknown as FallbackExecutor;
  const record = vi.fn().mockResolvedValue(undefined);
  const logging = { record } as unknown as RequestLoggingService;
  const controller = new GatewayController(
    {} as unknown as ModelsService,
    gateway,
    executor,
    logging,
  );
  const res = { setHeader: vi.fn(), json: vi.fn() } as unknown as Response;
  return { controller, res, buildChain, execute, record, chain };
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

  it('logs a request_logs row on a successful completion (TASK-055)', async () => {
    const { controller, res, record } = build({
      response: { id: 'x', usage: { total_tokens: 10 } } as never,
      routedVia: 'groq/llama-3.3-70b',
      attempts: 1,
    });

    await controller.chat(USER, BODY, undefined, res);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        requestedModel: 'auto',
        status: 'success',
        routedVia: 'groq/llama-3.3-70b',
        fallbackAttempts: 1,
      }),
    );
  });

  it('logs status error and rethrows when execution fails (TASK-055)', async () => {
    const { controller, res, record } = build({
      response: { id: 'x' } as never,
      routedVia: 'groq/b',
      attempts: 0,
    });
    (controller as unknown as { executor: FallbackExecutor }).executor.execute = vi
      .fn()
      .mockRejectedValue(new Error('all failed'));

    await expect(controller.chat(USER, BODY, undefined, res)).rejects.toThrow('all failed');
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', userId: 7 }));
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

describe('GatewayController.chat (streaming, TASK-052)', () => {
  it('streams SSE: telemetry headers, one data line per chunk, then [DONE]', async () => {
    const buildChain = vi.fn().mockResolvedValue([{ providerKey: 'groq', modelId: 1 }]);
    const gateway = { buildChain } as unknown as GatewayService;
    async function* chunks() {
      yield { id: '1' };
      yield { id: '2' };
    }
    const openStream = vi
      .fn()
      .mockResolvedValue({ stream: chunks(), routedVia: 'groq/m', attempts: 1 });
    const executor = { openStream } as unknown as FallbackExecutor;
    const logging = { record: vi.fn().mockResolvedValue(undefined) } as unknown as RequestLoggingService;
    const controller = new GatewayController(
      {} as unknown as ModelsService,
      gateway,
      executor,
      logging,
    );
    const writes: string[] = [];
    const res = {
      setHeader: vi.fn(),
      write: vi.fn((line: string) => writes.push(line)),
      end: vi.fn(),
    } as unknown as Response;

    const streamingBody = { ...BODY, stream: true } as unknown as ChatRequest;
    await controller.chat(USER, streamingBody, undefined, res);

    expect(openStream).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('X-Routed-Via', 'groq/m');
    expect(res.setHeader).toHaveBeenCalledWith('X-Fallback-Attempts', '1');
    expect(writes).toEqual([
      'data: {"id":"1"}\n\n',
      'data: {"id":"2"}\n\n',
      'data: [DONE]\n\n',
    ]);
    expect(res.end).toHaveBeenCalled();
  });
});
