import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Request body for creating a token: a human-friendly label. */
export class CreateTokenDto {
  @ApiProperty({
    maxLength: 100,
    example: 'scraperq-ci',
    description: 'Label to identify the token.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

/** Response for token creation: plaintext shown EXACTLY ONCE plus its display prefix. */
export class CreateTokenResponseDto {
  @ApiProperty({
    description: 'The full token — shown once; store it now, it is never retrievable again.',
    example: 'sqr-llm-Vu9k...redacted...',
  })
  token!: string;

  @ApiProperty({
    description: 'Short display prefix kept for identification.',
    example: 'sqr-llm-Vu9k',
  })
  prefix!: string;
}

/** Token metadata returned by list — never includes the secret hash. */
export class ApiTokenDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 'scraperq-ci' })
  name!: string;

  @ApiProperty({ example: 'sqr-llm-Vu9k' })
  prefix!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Last time the token authenticated a /v1 call.',
  })
  lastUsedAt!: Date | null;

  @ApiProperty()
  revoked!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
