import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LlmApiTokenGuard } from '../../common/guards/llm-api-token.guard.js';

/**
 * OpenAI-compatible surface (TASK-048). Mounted at the bare `/v1` path (excluded from the `api/v1`
 * global prefix) and authenticated by an LLM API token only — JWTs are rejected by the guard. This is
 * the surface external clients (e.g. ScraperQ) call; responses bypass the `{ data }` envelope.
 */
@ApiTags('gateway')
@ApiBearerAuth('llm-token')
@UseGuards(LlmApiTokenGuard)
@Controller('v1')
export class GatewayController {
  @Get('models')
  @ApiOperation({ summary: "List the caller's enabled models in OpenAI list shape." })
  @ApiOkResponse({ description: 'OpenAI `{ object: "list", data: [...] }` model list.' })
  listModels(): { object: 'list'; data: unknown[] } {
    // Real enabled-model listing is wired in TASK-049.
    return { object: 'list', data: [] };
  }
}
