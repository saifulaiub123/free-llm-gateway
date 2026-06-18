import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

/** Liveness endpoint used by load balancers, container health checks, and the boot smoke test. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  /** Returns a static OK payload; mounted at `GET /api/v1/health` via the global prefix. */
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'Service is up.', schema: { example: { status: 'ok' } } })
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
