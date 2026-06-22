import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthModule } from '../../modules/auth/auth.module.js';
import { HealthModule } from '../../modules/health/health.module.js';
import { ModelsModule } from '../../modules/models/models.module.js';
import { ProvidersModule } from '../../modules/providers/providers.module.js';
import { RoutingModule } from '../../modules/routing/routing.module.js';
import { TokensModule } from '../../modules/tokens/tokens.module.js';

/**
 * Feature modules exposed under the management API (`/api/v1`), documented at `/api/docs`.
 * Add each new management module here so its endpoints appear in the JWT-secured Swagger doc.
 */
const MANAGEMENT_MODULES = [
  AuthModule,
  TokensModule,
  ProvidersModule,
  ModelsModule,
  RoutingModule,
  HealthModule,
];

/**
 * Feature modules exposed under the OpenAI-compatible gateway (`/v1`), documented at `/v1/docs`.
 * Populated in Phase 6 when the gateway controllers exist (kept empty until then).
 */
const GATEWAY_MODULES: Array<new (...args: never[]) => unknown> = [];

/** Builds and mounts the JWT-secured management API document at `/api/docs` (+ JSON spec). */
const setupManagementDocs = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('Free LLM Gateway Management API')
    .setDescription('Auth, provider keys, models, routing strategies, tokens, analytics.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
    .build();
  const document = SwaggerModule.createDocument(app, config, { include: MANAGEMENT_MODULES });
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs-json' });
};

/** Builds and mounts the LLM-token-secured gateway document at `/v1/docs`. */
const setupGatewayDocs = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('Free LLM Gateway OpenAI-Compatible LLM API')
    .setDescription('POST /v1/chat/completions, GET /v1/models. Authenticate with an LLM API token.')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', description: 'Unified LLM API token (sqr-llm-...)' },
      'llm-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config, { include: GATEWAY_MODULES });
  SwaggerModule.setup('v1/docs', app, document, { jsonDocumentUrl: 'v1/docs-json' });
};

/**
 * Wires up TWO Swagger documents so each auth surface is documented with the correct credential.
 *
 * WHY two docs: the management API (`/api/v1`) is JWT-authenticated while the OpenAI-compatible
 * gateway (`/v1`) uses opaque `sqr-llm-` tokens. Splitting them keeps the UI honest about which
 * credential each endpoint expects and prevents a reader from trying a JWT against `/v1`.
 */
export function setupSwagger(app: INestApplication): void {
  setupManagementDocs(app);
  setupGatewayDocs(app);
}
