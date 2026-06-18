import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Maps any thrown error to a consistent JSON body.
 *
 * WHY a catch-all filter: domain/service code throws typed errors, and this single boundary turns
 * them into a stable shape without leaking stack traces or secrets (SEC-006). `HttpException`s keep
 * their status/message; anything else becomes a generic 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const error =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    response.status(status).json({ statusCode: status, error });
  }
}
