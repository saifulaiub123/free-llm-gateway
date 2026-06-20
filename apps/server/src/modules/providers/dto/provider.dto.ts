import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Request body for adding a provider API key to the user's pool. */
export class AddKeyDto {
  @ApiProperty({ description: 'The provider API key. Validated upstream, then encrypted at rest.' })
  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @ApiProperty({ required: false, maxLength: 100, example: 'work-account', description: 'Optional label.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}

/** A provider catalog entry (global, seeded). */
export class ProviderDto {
  @ApiProperty() id!: number;
  @ApiProperty({ example: 'groq' }) key!: string;
  @ApiProperty({ example: 'Groq' }) displayName!: string;
  @ApiProperty() baseUrl!: string;
  @ApiProperty() adapterType!: string;
  @ApiProperty() supportsStreaming!: boolean;
  @ApiProperty() supportsTools!: boolean;
  @ApiProperty() supportsVision!: boolean;
  @ApiProperty() supportsEmbeddings!: boolean;
}

/** Metadata for a user's stored provider key — never the encrypted material. */
export class ProviderKeyDto {
  @ApiProperty() id!: number;
  @ApiProperty() providerId!: number;
  @ApiProperty({ type: String, nullable: true }) label!: string | null;
  @ApiProperty({ enum: ['healthy', 'rate_limited', 'invalid', 'error'] }) status!: string;
  @ApiProperty({ type: String, nullable: true }) lastCheckedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}
