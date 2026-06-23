import { Module } from '@nestjs/common';
import { TokensModule } from '../tokens/tokens.module.js';
import { ModelsModule } from '../models/models.module.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';
import { RoutingModule } from '../routing/routing.module.js';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { LlmApiTokenGuard } from '../../common/guards/llm-api-token.guard.js';
import { GatewayController } from './gateway.controller.js';
import { GatewayService } from './gateway.service.js';
import { FallbackExecutor } from './fallback-executor.js';

/**
 * The OpenAI-compatible `/v1` gateway. Imports {@link TokensModule} so the {@link LlmApiTokenGuard}
 * can resolve `ApiTokenRepository` to authenticate `sqr-llm-` tokens, {@link ModelsModule} for the
 * enabled-model listing, {@link RoutingModule} for `buildChain`, {@link AnalyticsModule} for per-call
 * request logging, and the provider/rate-limit modules for the {@link FallbackExecutor}.
 */
@Module({
  imports: [
    TokensModule,
    ModelsModule,
    ProvidersModule,
    RateLimitModule,
    RoutingModule,
    AnalyticsModule,
  ],
  controllers: [GatewayController],
  providers: [LlmApiTokenGuard, GatewayService, FallbackExecutor],
})
export class GatewayModule {}
