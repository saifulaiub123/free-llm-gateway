import { Module } from '@nestjs/common';
import { TokensModule } from '../tokens/tokens.module.js';
import { LlmApiTokenGuard } from '../../common/guards/llm-api-token.guard.js';
import { GatewayController } from './gateway.controller.js';

/**
 * The OpenAI-compatible `/v1` gateway. Imports {@link TokensModule} so the {@link LlmApiTokenGuard}
 * can resolve `ApiTokenRepository` to authenticate `sqr-llm-` tokens.
 */
@Module({
  imports: [TokensModule],
  controllers: [GatewayController],
  providers: [LlmApiTokenGuard],
})
export class GatewayModule {}
