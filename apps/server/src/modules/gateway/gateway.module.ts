import { Module } from '@nestjs/common';
import { TokensModule } from '../tokens/tokens.module.js';
import { ModelsModule } from '../models/models.module.js';
import { LlmApiTokenGuard } from '../../common/guards/llm-api-token.guard.js';
import { GatewayController } from './gateway.controller.js';

/**
 * The OpenAI-compatible `/v1` gateway. Imports {@link TokensModule} so the {@link LlmApiTokenGuard}
 * can resolve `ApiTokenRepository` to authenticate `sqr-llm-` tokens, and {@link ModelsModule} for the
 * enabled-model listing.
 */
@Module({
  imports: [TokensModule, ModelsModule],
  controllers: [GatewayController],
  providers: [LlmApiTokenGuard],
})
export class GatewayModule {}
