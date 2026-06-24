import { Body, Controller, Get, Headers, Post, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { ChatRequest } from '@gateway/provider-adapters';
import { LlmApiTokenGuard } from '../../common/guards/llm-api-token.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUser as Principal } from '../auth/auth.types.js';
import type { RoutingCandidate } from '../routing/types/routing-candidate.js';
import { ModelsService } from '../models/models.service.js';
import { RequestLoggingService } from '../analytics/request-logging.service.js';
import { GatewayService } from './gateway.service.js';
import { FallbackExecutor } from './fallback-executor.js';
import { ChatCompletionDto } from './dto/chat-completion.dto.js';

/** A single entry in the OpenAI `/v1/models` list. */
interface OpenAiModel {
  id: string;
  object: 'model';
  owned_by: string;
}

/**
 * OpenAI-compatible surface (TASK-048…053). Mounted at the bare `/v1` path (excluded from the `api/v1`
 * global prefix) and authenticated by an LLM API token only — JWTs are rejected by the guard. This is
 * the surface external clients (e.g. ScraperQ) call; responses bypass the `{ data }` envelope.
 */
@ApiTags('gateway')
@ApiBearerAuth('llm-token')
@UseGuards(LlmApiTokenGuard)
@Controller('v1')
export class GatewayController {
  constructor(
    private readonly models: ModelsService,
    private readonly gateway: GatewayService,
    private readonly executor: FallbackExecutor,
    private readonly logging: RequestLoggingService,
  ) {}

  @Get('models')
  @ApiOperation({ summary: "List the caller's enabled models in OpenAI list shape." })
  @ApiOkResponse({ description: 'OpenAI `{ object: "list", data: [...] }` model list.' })
  async listModels(
    @CurrentUser() user: Principal,
  ): Promise<{ object: 'list'; data: OpenAiModel[] }> {
    const models = await this.models.listEnabled(user.id);
    return {
      object: 'list',
      data: models.map((model) => ({
        id: model.modelId,
        object: 'model',
        owned_by: model.providerKey,
      })),
    };
  }

  @Post('chat/completions')
  @ApiOperation({
    summary: 'Route an OpenAI chat completion through the metric-driven fallback chain.',
  })
  @ApiBody({ type: ChatCompletionDto })
  @ApiOkResponse({ description: 'OpenAI chat-completion response (+ `X-Routed-Via` header).' })
  async chat(
    @CurrentUser() user: Principal,
    @Body() body: ChatRequest,
    @Headers('x-routing-strategy') strategyHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const chain = await this.gateway.buildChain(user.id, body, strategyHeader);
    const startedAt = Date.now();
    if (body.stream === true) {
      await this.streamChat(user.id, chain, body, res, startedAt);
      return;
    }
    try {
      const result = await this.executor.execute(user.id, chain, body);
      await this.logging.record({
        userId: user.id,
        requestedModel: body.model,
        eligible: chain,
        latencyMs: Date.now() - startedAt,
        status: 'success',
        winningCandidate: result.winningCandidate,
        routedVia: result.routedVia,
        fallbackAttempts: result.attempts,
        usage: result.response.usage,
      });
      res.setHeader('X-Routed-Via', result.routedVia);
      if (result.attempts > 0) {
        res.setHeader('X-Fallback-Attempts', String(result.attempts));
      }
      // OpenAI chat completions return 200 (not Nest's `@Post` default 201) so external clients
      // (e.g. ScraperQ) see the standard status they expect.
      res.status(200).json(result.response);
    } catch (error) {
      // WHY log before rethrow: an all-failed request is still a usage event analytics must see.
      await this.logging.record({
        userId: user.id,
        requestedModel: body.model,
        eligible: chain,
        latencyMs: Date.now() - startedAt,
        status: 'error',
      });
      throw error;
    }
  }

  /**
   * Streams a chat completion as SSE (TASK-052). Telemetry headers are set BEFORE the first `data:`
   * line; once the stream opens an upstream error surfaces as a stream error (no transparent failover).
   */
  private async streamChat(
    userId: number,
    chain: RoutingCandidate[],
    body: ChatRequest,
    res: Response,
    startedAt: number,
  ): Promise<void> {
    const { stream, routedVia, attempts, winningCandidate } = await this.executor.openStream(userId, chain, body);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Routed-Via', routedVia);
    if (attempts > 0) {
      res.setHeader('X-Fallback-Attempts', String(attempts));
    }
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
    // WHY token counts are 0 for streams: usage is not aggregated from SSE deltas here; the log still
    // records the routing decision, latency, and cost-saved baseline (which is 0 at 0 tokens).
    await this.logging.record({
      userId,
      requestedModel: body.model,
      eligible: chain,
      latencyMs: Date.now() - startedAt,
      status: 'success',
      winningCandidate,
      routedVia,
      fallbackAttempts: attempts,
    });
  }
}
