import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';

/** Bundles the liveness controller. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
