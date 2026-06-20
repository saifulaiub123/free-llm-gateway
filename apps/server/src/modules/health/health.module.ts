import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { KeyHealthProbeService } from './key-health-probe.service.js';
import { ProvidersModule } from '../providers/providers.module.js';

/** Bundles the liveness controller and the scheduled provider-key health probe. */
@Module({
  imports: [ProvidersModule],
  controllers: [HealthController],
  providers: [KeyHealthProbeService],
})
export class HealthModule {}
