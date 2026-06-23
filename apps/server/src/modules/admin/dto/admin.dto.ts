import { ApiProperty } from '@nestjs/swagger';
import {
  Allow,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Admin-create-user request (bypasses the self-registration gate). */
export class CreateUserDto {
  @ApiProperty({ format: 'email', example: 'teammate@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: ['admin', 'user'], default: 'user' })
  @IsIn(['admin', 'user'])
  role!: 'admin' | 'user';
}

/** Admin update for a user's role and/or enabled flag. */
export class UpdateUserDto {
  @ApiProperty({ enum: ['admin', 'user'], required: false })
  @IsOptional()
  @IsIn(['admin', 'user'])
  role?: 'admin' | 'user';

  @ApiProperty({ required: false, description: 'Enable (true) or disable (false) the account.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Admin update for a global setting's value (validated against the Settings Registry). */
export class UpdateSettingDto {
  // @Allow keeps the value past the whitelisting ValidationPipe; the real check is the registry schema.
  @Allow()
  @ApiProperty({ description: 'New value; validated against the setting\'s registry schema.' })
  value!: unknown;
}
