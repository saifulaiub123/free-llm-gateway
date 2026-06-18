import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';

/** Envelope wrapping every management-API success response in a `data` field. */
export interface ResponseEnvelope<T> {
  data: T;
}

/**
 * Wraps successful responses in a consistent `{ data }` envelope.
 *
 * WHY: management clients get a predictable response shape. NOTE: the OpenAI-compatible `/v1`
 * gateway (Phase 6) MUST bypass this wrapper to stay wire-compatible (CON-003); those controllers
 * are excluded from the global prefix and will opt out via a dedicated decorator when added.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
