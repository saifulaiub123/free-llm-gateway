import { Module } from '@nestjs/common';
import { TokensController } from './tokens.controller.js';
import { TokensService } from './tokens.service.js';
import { ApiTokenRepository } from './api-token.repository.js';

/** Management of unified LLM API tokens (`sqr-llm-…`). */
@Module({
  controllers: [TokensController],
  providers: [TokensService, ApiTokenRepository],
  // Re-used by LlmApiTokenGuard (TASK-015) to authenticate /v1 requests.
  exports: [ApiTokenRepository],
})
export class TokensModule {}
