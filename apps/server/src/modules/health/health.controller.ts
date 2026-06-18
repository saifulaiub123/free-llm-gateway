import { Controller, Get } from '@nestjs/common';

/** Liveness endpoint used by load balancers, container health checks, and the boot smoke test. */
@Controller('health')
export class HealthController {
  /** Returns a static OK payload; mounted at `GET /api/v1/health` via the global prefix. */
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
