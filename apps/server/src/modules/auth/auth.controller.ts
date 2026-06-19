import { Body, Controller, HttpCode, HttpStatus, Ip, Post, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto, RefreshDto, RegisterDto, TokenPairDto } from './dto/auth.dto.js';
import type { RequestContext, TokenPair } from './auth.types.js';

/** Thin controller: validates input via DTOs and delegates entirely to {@link AuthService}. */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Captures request metadata for refresh-token session audit. */
  private context(ip: string, req: Request): RequestContext {
    return { ip, userAgent: req.headers['user-agent'] };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user; returns an access + refresh token pair.' })
  @ApiCreatedResponse({ type: TokenPairDto })
  register(@Body() dto: RegisterDto, @Ip() ip: string, @Req() req: Request): Promise<TokenPair> {
    return this.auth.register(dto.email, dto.password, this.context(ip, req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email + password.' })
  @ApiOkResponse({ type: TokenPairDto })
  login(@Body() dto: LoginDto, @Ip() ip: string, @Req() req: Request): Promise<TokenPair> {
    return this.auth.login(dto.email, dto.password, this.context(ip, req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token for a new token pair.' })
  @ApiOkResponse({ type: TokenPairDto })
  refresh(@Body() dto: RefreshDto, @Ip() ip: string, @Req() req: Request): Promise<TokenPair> {
    return this.auth.refresh(dto.refreshToken, this.context(ip, req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh token (and its rotation family).' })
  @ApiOkResponse({ description: 'The token family was revoked.' })
  async logout(@Body() dto: RefreshDto): Promise<{ revoked: true }> {
    await this.auth.logout(dto.refreshToken);
    return { revoked: true };
  }
}
