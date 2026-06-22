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
import { ModelsService } from '../models/models.service.js';
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
    const result = await this.executor.execute(user.id, chain, body);
    res.setHeader('X-Routed-Via', result.routedVia);
    if (result.attempts > 0) {
      res.setHeader('X-Fallback-Attempts', String(result.attempts));
    }
    res.json(result.response);
  }
}
