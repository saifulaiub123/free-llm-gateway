import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LlmApiTokenGuard } from '../../common/guards/llm-api-token.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUser as Principal } from '../auth/auth.types.js';
import { ModelsService } from '../models/models.service.js';

/** A single entry in the OpenAI `/v1/models` list. */
interface OpenAiModel {
  id: string;
  object: 'model';
  owned_by: string;
}

/**
 * OpenAI-compatible surface (TASK-048/049). Mounted at the bare `/v1` path (excluded from the `api/v1`
 * global prefix) and authenticated by an LLM API token only — JWTs are rejected by the guard. This is
 * the surface external clients (e.g. ScraperQ) call; responses bypass the `{ data }` envelope.
 */
@ApiTags('gateway')
@ApiBearerAuth('llm-token')
@UseGuards(LlmApiTokenGuard)
@Controller('v1')
export class GatewayController {
  constructor(private readonly models: ModelsService) {}

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
}
