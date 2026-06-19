import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { CurrentUser, JwtPayload } from './auth.types.js';

/**
 * Validates access JWTs for the management API (`/api/v1`) and exposes the current user to
 * controllers. Registered under the default `'jwt'` Passport name used by `JwtAuthGuard` (TASK-013).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /** Maps the verified token payload to the principal attached as `request.user`. */
  validate(payload: JwtPayload): CurrentUser {
    return { id: payload.sub, role: payload.role };
  }
}
