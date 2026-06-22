import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** Registration request: a unique email + a password (Argon2id-hashed server-side). */
export class RegisterDto {
  @ApiProperty({ format: 'email', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128, example: 'correct-horse-battery' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

/** Login request. */
export class LoginDto {
  @ApiProperty({ format: 'email', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'correct-horse-battery' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

/** Carries an opaque refresh token (used by refresh + logout). */
export class RefreshDto {
  @ApiProperty({ description: 'The opaque refresh token returned by login/register/refresh.' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

/** Response body for register/login/refresh: the issued token pair. */
export class TokenPairDto {
  @ApiProperty({ description: 'Short-lived JWT access token for the `/api/v1` management API.' })
  accessToken!: string;

  @ApiProperty({ description: 'Opaque, rotating refresh token (store securely).' })
  refreshToken!: string;
}

/** Public registration status for the register page (no auth required). */
export class RegistrationStatusDto {
  @ApiProperty({ description: 'Whether new users may self-register right now.' })
  registrationEnabled!: boolean;

  @ApiProperty({ description: 'Whether any account exists yet (the first registration bootstraps an admin).' })
  hasUsers!: boolean;
}
