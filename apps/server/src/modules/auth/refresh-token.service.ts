import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import { parseDuration } from '../../common/util/parse-duration.js';
import type { RequestContext } from './auth.types.js';

/** Owns the lifecycle of hashed, rotating refresh tokens (issue / rotate / revoke-family). */
@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly repo: RefreshTokenRepository,
    private readonly config: ConfigService,
  ) {}

  /** Stores only the SHA-256 hash so a DB leak cannot mint sessions (SEC-002). */
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Issues a new opaque refresh token, persisting only its hash. */
  async issue(userId: number, ctx?: RequestContext, familyId?: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const ttlMs = parseDuration(this.config.get<string>('JWT_REFRESH_TTL') ?? '30d');
    await this.repo.create({
      userId,
      tokenHash: this.hash(token),
      familyId: familyId ?? randomUUID(),
      expiresAt: new Date(Date.now() + ttlMs),
      createdByIp: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });
    return token;
  }

  /**
   * Validates and rotates a presented token, returning its owner + family.
   *
   * WHY family revocation: if the token is valid in shape but already revoked, it was likely stolen
   * and replayed — we revoke every token in its family so neither the attacker nor the victim can
   * continue with a compromised lineage (token-reuse detection).
   */
  async rotate(presented: string): Promise<{ userId: number; familyId: string }> {
    const record = await this.repo.findByHash(this.hash(presented));
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (record.revokedAt) {
      await this.repo.revokeFamily(record.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    await this.repo.revoke(record.id);
    return { userId: record.userId, familyId: record.familyId };
  }

  /** Revokes the family a presented token belongs to (logout). No-op for an unknown token. */
  async revoke(presented: string): Promise<void> {
    const record = await this.repo.findByHash(this.hash(presented));
    if (record) {
      await this.repo.revokeFamily(record.familyId);
    }
  }
}
