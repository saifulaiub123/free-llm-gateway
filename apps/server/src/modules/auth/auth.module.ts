import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SettingsModule } from '../settings/settings.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { UsersRepository } from './users.repository.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';

/**
 * Identity module: registration, login, JWT issuance, and hashed refresh-token rotation.
 *
 * `JwtModule.register({})` provides `JwtService` with no global secret — each access token is signed
 * with the secret/TTL pulled from `ConfigService` at sign time, so the validated env owns them.
 * Imports {@link SettingsModule} for the `auth.registration_enabled` gate (TASK-073/074).
 */
@Module({
  imports: [PassportModule, JwtModule.register({}), SettingsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenService,
    JwtStrategy,
    UsersRepository,
    RefreshTokenRepository,
  ],
  exports: [AuthService, UsersRepository],
})
export class AuthModule {}
