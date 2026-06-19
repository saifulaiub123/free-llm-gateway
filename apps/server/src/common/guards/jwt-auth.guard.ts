import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guards every management `/api/v1` route by validating an access **JWT** only.
 *
 * WHY a thin subclass of `AuthGuard('jwt')`: it binds the controller to the `'jwt'` Passport strategy
 * ({@link JwtStrategy}), which verifies the bearer token's signature/expiry and attaches the principal
 * as `request.user`. It deliberately accepts ONLY JWTs — LLM API tokens (`sqr-llm-…`) are rejected
 * here and are instead handled by `LlmApiTokenGuard` on the separate `/v1` gateway surface, so the two
 * credential types can never be used interchangeably (SEC: two-guard separation).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
