import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersRepository } from './users.repository.js';
import { RefreshTokenService } from './refresh-token.service.js';
import type { RequestContext, TokenPair } from './auth.types.js';

/** Coordinates registration, login, refresh, and logout. Holds no persistence logic itself. */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly config: ConfigService,
  ) {}

  /** Registers a new user with an Argon2id password hash. Rejects duplicate emails. */
  async register(email: string, password: string, ctx?: RequestContext): Promise<TokenPair> {
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Email already in use');
    }
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await this.users.create({ email, passwordHash });
    return this.issueTokens(user.id, user.role, ctx);
  }

  /** Verifies credentials with a constant-time Argon2 check and issues a fresh token pair. */
  async login(email: string, password: string, ctx?: RequestContext): Promise<TokenPair> {
    const user = await this.users.findByEmail(email);
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user.id, user.role, ctx);
  }

  /** Rotates a refresh token and issues a new pair in the same family. */
  async refresh(presentedToken: string, ctx?: RequestContext): Promise<TokenPair> {
    const { userId, familyId } = await this.refreshTokens.rotate(presentedToken);
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.issueTokens(user.id, user.role, ctx, familyId);
  }

  /** Logs out by revoking the presented refresh token's whole family. */
  async logout(presentedToken: string): Promise<void> {
    await this.refreshTokens.revoke(presentedToken);
  }

  /** Signs a short-lived access JWT and pairs it with a freshly issued refresh token. */
  private async issueTokens(
    userId: number,
    role: string,
    ctx?: RequestContext,
    familyId?: string,
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      },
    );
    const refreshToken = await this.refreshTokens.issue(userId, ctx, familyId);
    return { accessToken, refreshToken };
  }
}
