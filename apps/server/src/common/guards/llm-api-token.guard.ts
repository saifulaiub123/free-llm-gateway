import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ApiTokenRepository } from '../../modules/tokens/api-token.repository.js';
import type { CurrentUser } from '../../modules/auth/auth.types.js';

/** The shape of the request fields this guard reads and writes. */
interface GatewayRequest {
  headers: Record<string, string | string[] | undefined>;
  currentUser?: CurrentUser;
}

/**
 * Protects every `/v1` gateway route. Accepts ONLY unified LLM API tokens (`sqr-llm-…`) — rejects JWTs.
 *
 * WHY a custom guard (not Passport-JWT): the `/v1` surface authenticates with opaque, hashed tokens —
 * a deliberately different mechanism from the dashboard JWT — so the two surfaces can never be
 * accessed with the wrong credential type (SEC: two-guard separation). The presented token is hashed
 * with SHA-256 and matched against the stored hash; the plaintext is never persisted or logged.
 */
@Injectable()
export class LlmApiTokenGuard implements CanActivate {
  constructor(private readonly tokens: ApiTokenRepository) {}

  /**
   * @param context The request context whose `Authorization: Bearer <sqr-llm-…>` header is verified.
   * @returns true when the token is valid and active; otherwise throws {@link UnauthorizedException}.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GatewayRequest>();
    const header = request.headers['authorization'];
    const presented =
      typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : undefined;

    // Reject anything that is not an LLM API token (e.g. a dashboard JWT) before any DB work.
    if (!presented || !presented.startsWith('sqr-llm-')) {
      throw new UnauthorizedException('Missing or malformed LLM API token');
    }

    const tokenHash = createHash('sha256').update(presented).digest('hex');
    const record = await this.tokens.findActiveByHash(tokenHash);
    if (!record) {
      throw new UnauthorizedException('Invalid or revoked LLM API token');
    }

    await this.tokens.touchLastUsed(record.id);
    request.currentUser = { id: record.userId, role: 'user' };
    return true;
  }
}
