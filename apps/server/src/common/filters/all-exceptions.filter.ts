import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Maps any thrown error to a consistent JSON body.
 *
 * WHY a catch-all filter: domain/service code throws typed errors, and this single boundary turns
 * them into a stable shape without leaking stack traces or secrets (SEC-006). `HttpException`s keep
 * their status/message; anything else becomes a generic 500.
 *
 * Server errors (5xx) are logged at `error` level with the full stack trace so operators can
 * diagnose production issues. Client errors (4xx) are logged at `warn` level without a stack.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const error =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    if (status >= 500) {
      const message =
        exception instanceof Error ? exception.message : typeof error === 'string' ? error : 'Internal server error';
      this.logger.error(`[${status}] ${message}`, exception instanceof Error ? exception.stack : undefined);
    } else if (status >= 400) {
      this.logger.warn(`[${status}] ${typeof error === 'string' ? error : JSON.stringify(error)}`);
    }

    response.status(status).json({ statusCode: status, error });
  }
}
