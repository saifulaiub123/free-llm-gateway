import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { ApiTokenRepository, type ApiTokenMetadata } from './api-token.repository.js';

/** Issues and manages unified LLM API tokens. Plaintext is returned once and never persisted. */
@Injectable()
export class TokensService {
  constructor(private readonly repository: ApiTokenRepository) {}

  /**
   * Creates a token.
   *
   * WHY this shape: the `sqr-llm-` prefix makes the credential type obvious in client configs and
   * logs, while only the SHA-256 hash is persisted so the database never holds a usable secret.
   * The full plaintext is returned exactly once for the user to copy.
   */
  async create(userId: number, name: string): Promise<{ token: string; prefix: string }> {
    const secret = randomBytes(24).toString('base64url');
    const token = `sqr-llm-${secret}`;
    const prefix = token.slice(0, 12);
    await this.repository.create({ userId, name, prefix, tokenHash: this.hash(token) });
    return { token, prefix };
  }

  /** Lists the user's tokens as metadata (never the hash). */
  list(userId: number): Promise<ApiTokenMetadata[]> {
    return this.repository.listByUser(userId);
  }

  /** Revokes one of the user's tokens; returns whether a matching token was revoked. */
  revoke(userId: number, id: number): Promise<boolean> {
    return this.repository.revokeOwned(userId, id);
  }

  /** SHA-256 hex digest of a token; only this is ever persisted. */
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
