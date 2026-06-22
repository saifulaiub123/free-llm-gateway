import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service.js';
import { CooldownService } from './cooldown.service.js';
import { RuntimeStatsService } from './runtime-stats.service.js';

/**
 * In-memory hot caches for the routing engine: rate-limit counters, cooldowns, and runtime stats.
 * These hold per-process state read on the hot path; the matching tables provide durable backing.
 */
@Module({
  providers: [RateLimitService, CooldownService, RuntimeStatsService],
  exports: [RateLimitService, CooldownService, RuntimeStatsService],
})
export class RateLimitModule {}
