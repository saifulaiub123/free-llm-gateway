import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { type DynamicModule, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

/** Absolute path to the built SvelteKit SPA, overridable via `CLIENT_DIST_PATH`. */
const resolveClientDistPath = (): string =>
  process.env.CLIENT_DIST_PATH ?? resolve(process.cwd(), '..', 'client', 'build');

/**
 * Serves the built client SPA from the same server (single-image deployment).
 *
 * WHY a conditional dynamic module: in production the dashboard is static files served by NestJS
 * (no second process), but in dev/test the client is served by Vite — so this becomes a no-op there
 * to keep the API tests free of a catch-all static route. API surfaces are excluded so `/api/v1`
 * and `/v1` keep their JSON handlers; everything else falls back to the SPA's `index.html`.
 */
@Module({})
export class StaticModule {
  static register(): DynamicModule {
    const distPath = resolveClientDistPath();
    const enabled = process.env.NODE_ENV === 'production' && existsSync(distPath);
    return {
      module: StaticModule,
      imports: enabled
        ? [
            ServeStaticModule.forRoot({
              rootPath: distPath,
              exclude: ['/api/(.*)', '/v1/(.*)'],
            }),
          ]
        : [],
    };
  }
}
