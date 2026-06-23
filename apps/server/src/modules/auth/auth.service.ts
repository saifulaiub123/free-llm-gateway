import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { SettingsService } from '../settings/settings.service.js';
import { UsersRepository } from './users.repository.js';
import { RefreshTokenService } from './refresh-token.service.js';
import type { RequestContext, TokenPair } from './auth.types.js';

/** Whether self-registration is open + whether any account exists yet (drives the register page). */
export interface RegistrationStatus {
  registrationEnabled: boolean;
  hasUsers: boolean;
}

/** Coordinates registration, login, refresh, and logout. Holds no persistence logic itself. */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Registers a new user with an Argon2id password hash.
   *
   * WHY first-user-admin: the very first account bootstraps as `admin` with zero config (REQ-023), so
   * a fresh install is never locked out — registration gating never applies to it. Every later account
   * defaults to `user` and is rejected when self-registration is disabled. The count + role decision is
   * deliberately NOT wrapped in `db.transaction`: libSQL `:memory:` (used by the e2e suite) opens an
   * isolated connection for a transaction that cannot see the main connection's tables. The remaining
   * "two concurrent first registrations" race is acceptable for a self-hosted single-operator tool.
   */
  async register(email: string, password: string, ctx?: RequestContext): Promise<TokenPair> {
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Email already in use');
    }
    const isFirstUser = (await this.users.count()) === 0;
    if (!isFirstUser && !(await this.settings.get('auth.registration_enabled'))) {
      throw new ForbiddenException('Registration is disabled');
    }
    const role = isFirstUser ? 'admin' : 'user';
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await this.users.create({ email, passwordHash, role });
    return this.issueTokens(user.id, user.role, ctx);
  }

  /** Verifies credentials with a constant-time Argon2 check and issues a fresh token pair. */
  async login(email: string, password: string, ctx?: RequestContext): Promise<TokenPair> {
    const user = await this.users.findByEmail(email);
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }
    return this.issueTokens(user.id, user.role, ctx);
  }

  /** Reports whether the public register page should be open (bootstrap is always open). */
  async registrationStatus(): Promise<RegistrationStatus> {
    const hasUsers = (await this.users.count()) > 0;
    // Before any user exists, registration is effectively open (bootstrap), regardless of the flag.
    const registrationEnabled = !hasUsers || (await this.settings.get('auth.registration_enabled'));
    return { registrationEnabled, hasUsers };
  }

  /**
   * Creates an account on behalf of an admin (TASK-075) — bypasses the self-registration gate and
   * issues no tokens. Used by `AdminUsersController` so an admin can add users even when public
   * registration is disabled.
   */
  async createAccount(
    email: string,
    password: string,
    role: 'admin' | 'user',
  ): Promise<{ id: number; email: string; role: string; isActive: boolean }> {
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Email already in use');
    }
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await this.users.create({ email, passwordHash, role });
    return { id: user.id, email: user.email, role: user.role, isActive: user.isActive };
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
