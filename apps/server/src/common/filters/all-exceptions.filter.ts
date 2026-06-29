import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppLogService } from '../../modules/app-log/app-log.service.js';

/**
 * Maps any thrown error to a consistent JSON body.
 *
 * WHY a catch-all filter: domain/service code throws typed errors, and this single boundary turns
 * them into a stable shape without leaking stack traces or secrets (SEC-006). `HttpException`s keep
 * their status/message; anything else becomes a generic 500.
 *
 * Server errors (5xx) are persisted to `app_logs` at `error` level with the full stack trace so
 * operators can diagnose production issues. Client errors (4xx) are persisted at `warn` level
 * without a stack. The Pino logger is also called so stdout / Docker logs still capture the event.
 *
 * {@link AppLogService} is injected as `@Optional()` so tests that bypass the `AppLogModule` do
 * not crash the filter — persistence is best-effort and never cascades.
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(@Optional() private readonly appLogService?: AppLogService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url?: string; method?: string; user?: { id?: number } }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const error =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const message =
      exception instanceof Error ? exception.message : typeof error === 'string' ? error : 'Internal server error';
    const stack = exception instanceof Error ? exception.stack : undefined;

    // Level: 5xx → error, 4xx → warn
    const level = status >= 500 ? 'error' : 'warn';

    // 1. Log to Pino (stdout / Docker)
    if (status >= 500) {
      this.logger.error(`[${status}] ${message}`, stack);
    } else if (status >= 400) {
      this.logger.warn(`[${status}] ${typeof error === 'string' ? error : JSON.stringify(error)}`);
    }

    // 2. Persist to app_logs table (best-effort, never throw)
    if (this.appLogService) {
      const ctx: Record<string, unknown> = { statusCode: status };
      if (request?.method) ctx.method = request.method;
      if (request?.url) ctx.url = request.url;
      const userId = (request?.user as { id?: number })?.id;
      if (userId !== undefined) ctx.userId = userId;
      this.appLogService.log(level, message, level === 'error' ? stack : undefined, ctx).catch(() => {
        /* never throw from a filter */
      });
    }

    response.status(status).json({ statusCode: status, error });
  }
}
