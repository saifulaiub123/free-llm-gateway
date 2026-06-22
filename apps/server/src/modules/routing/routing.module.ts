import { Module } from '@nestjs/common';
import { ProvidersModule } from '../providers/providers.module.js';
import { ModelsModule } from '../models/models.module.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';
import { CandidateLoader } from './candidate-loader.js';
import { ChainFilter } from './chain-filter.js';
import { ChainOrderer } from './chain-orderer.js';
import { RoutingService } from './routing.service.js';
import { StrategiesService } from './strategies.service.js';
import { StrategiesController } from './strategies.controller.js';
import { RoutingStrategyRepository } from './routing-strategy.repository.js';
import { SettingsService } from './settings.service.js';
import { SettingsRepository } from './settings.repository.js';
import { RoutingStrategyFactory } from './strategies/routing-strategy.factory.js';
import { ManualStrategy } from './strategies/manual.strategy.js';
import { FreeFirstStrategy } from './strategies/free-first.strategy.js';
import { FastestStrategy } from './strategies/fastest.strategy.js';
import { SmartStrategy } from './strategies/smart.strategy.js';
import { BalancedStrategy } from './strategies/balanced.strategy.js';

/**
 * The metric-driven routing engine: candidate loading, eligibility filtering, the five strategies +
 * factory, ordering, `RoutingService.buildChain`, and per-user strategy management. Reuses the
 * provider/model repositories and the in-memory rate-limit/cooldown/stats services.
 */
@Module({
  imports: [ProvidersModule, ModelsModule, RateLimitModule],
  controllers: [StrategiesController],
  providers: [
    CandidateLoader,
    ChainFilter,
    ChainOrderer,
    RoutingService,
    StrategiesService,
    RoutingStrategyRepository,
    SettingsService,
    SettingsRepository,
    RoutingStrategyFactory,
    ManualStrategy,
    FreeFirstStrategy,
    FastestStrategy,
    SmartStrategy,
    BalancedStrategy,
  ],
  exports: [RoutingService, RoutingStrategyRepository],
})
export class RoutingModule {}
