import { Module } from '@nestjs/common';
import { TokensModule } from '../tokens/tokens.module.js';
import { ModelsModule } from '../models/models.module.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';
import { LlmApiTokenGuard } from '../../common/guards/llm-api-token.guard.js';
import { GatewayController } from './gateway.controller.js';
import { FallbackExecutor } from './fallback-executor.js';

/**
 * The OpenAI-compatible `/v1` gateway. Imports {@link TokensModule} so the {@link LlmApiTokenGuard}
 * can resolve `ApiTokenRepository` to authenticate `sqr-llm-` tokens, {@link ModelsModule} for the
 * enabled-model listing, and the provider/rate-limit modules for the {@link FallbackExecutor}.
 */
@Module({
  imports: [TokensModule, ModelsModule, ProvidersModule, RateLimitModule],
  controllers: [GatewayController],
  providers: [LlmApiTokenGuard, FallbackExecutor],
})
export class GatewayModule {}
