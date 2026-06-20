import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Summary returned by the fetch-models action. */
export class FetchModelsResultDto {
  @ApiProperty({ description: 'Total models discovered and upserted into the catalog.' })
  fetched!: number;

  @ApiProperty({ description: 'How many of the fetched models are free (enabled by default).' })
  free!: number;
}

/** A model in the user's catalog: catalog metadata or custom-model details + the enabled flag. */
export class UserModelDto {
  @ApiProperty() userModelId!: number;
  @ApiProperty({ example: 'llama-3.3-70b' }) modelId!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ type: Number, nullable: true }) providerId!: number | null;
  @ApiProperty() enabled!: boolean;
  @ApiProperty() isCustom!: boolean;
  @ApiProperty() isFree!: boolean;
  @ApiProperty() intelligenceScore!: number;
  @ApiProperty({ enum: ['slow', 'medium', 'fast'] }) speedTier!: string;
  @ApiProperty() inputCostPer1m!: number;
  @ApiProperty() outputCostPer1m!: number;
  @ApiProperty({ type: Number, nullable: true }) contextWindow!: number | null;
  @ApiProperty({ type: Object }) capabilities!: Record<string, boolean>;
}

/** Patch for a user model row: toggle enable and/or set cost/capability overrides. */
export class UpdateUserModelDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false, type: Object, description: 'Cost/capability overrides.' })
  @IsOptional()
  @IsObject()
  overrides?: Record<string, unknown>;
}

/** Request body to add a fully-custom model under a provider. */
export class CreateCustomModelDto {
  @ApiProperty({ example: 'custom', description: 'Provider key the custom model belongs to.' })
  @IsString()
  @IsNotEmpty()
  providerKey!: string;

  @ApiProperty({ example: 'my-self-hosted-llm' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  modelId!: string;

  @ApiProperty({ example: 'My Self-Hosted LLM' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  displayName!: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  inputCostPer1m?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  outputCostPer1m?: number;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  capabilities?: Record<string, boolean>;
}
