import { type INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

/**
 * Applies the cross-cutting global configuration shared by production boot and tests.
 *
 * WHY a shared function: `main.ts` and the e2e test must configure the app identically (prefix,
 * validation, error mapping, response envelope, CORS). Centralizing it guarantees the test exercises
 * the same pipeline that runs in production.
 *
 * Two route roots: management controllers live under the global `api/v1` prefix; the OpenAI-compatible
 * gateway controllers are mounted at bare `v1` and excluded from this prefix (they stay wire-compatible
 * and skip the response envelope).
 *
 * NOTE: `AllExceptionsFilter` is NOT registered here — it is wired via the `APP_FILTER` provider
 * token in `AppModule` so it gets DI access to `AppLogService` for persisting 5xx / 4xx errors to
 * the database.
 */
export function applyGlobalConfig(app: INestApplication): void {
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'v1/(.*)', method: RequestMethod.ALL }],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.enableCors({
    origin: ['https://llm.scraperq.com', 'http://localhost:5173'],
  });
}
