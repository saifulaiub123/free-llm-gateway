import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUser as Principal } from '../auth/auth.types.js';
import { AnalyticsService, type UsageSummary } from './analytics.service.js';
import type { ProviderUsageRow, LogPage } from './request-log.repository.js';

/**
 * Read-only usage analytics for the dashboard (TASK-056). JWT-guarded; every query is scoped to the
 * calling user (SEC-004) — a user only ever sees their own request logs.
 */
@ApiTags('analytics')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Volume, success rate, latency, tokens, and total cost saved over a window.' })
  @ApiQuery({ name: 'window', required: false, enum: ['24h', '7d', '30d'] })
  @ApiOkResponse({ description: 'Aggregated usage summary for the window.' })
  summary(
    @CurrentUser() user: Principal,
    @Query('window') window?: string,
  ): Promise<UsageSummary> {
    return this.analytics.summary(user.id, window);
  }

  @Get('by-provider')
  @ApiOperation({ summary: 'Per-provider usage breakdown over a window.' })
  @ApiQuery({ name: 'window', required: false, enum: ['24h', '7d', '30d'] })
  @ApiOkResponse({ description: 'Per-provider usage rows, busiest first.' })
  byProvider(
    @CurrentUser() user: Principal,
    @Query('window') window?: string,
  ): Promise<ProviderUsageRow[]> {
    return this.analytics.byProvider(user.id, window);
  }
}

/** Paginated, user-scoped access to the raw `request_logs` ledger (TASK-056). */
@ApiTags('logs')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: "List the caller's request logs (keyset pagination, newest-first)." })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'One page of request logs plus the next cursor.' })
  list(
    @CurrentUser() user: Principal,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<LogPage> {
    return this.analytics.listLogs(
      user.id,
      cursor !== undefined ? Number(cursor) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }
}
