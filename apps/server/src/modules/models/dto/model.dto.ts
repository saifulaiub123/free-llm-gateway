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
  @ApiProperty({ type: Number, nullable: true, description: 'The stored provider key that discovered this model (KSM-003).' })
  providerKeyId!: number | null;
  @ApiProperty({ type: String, nullable: true, description: 'Label of the provider key, e.g. "personal" or "work" (KSM-005).' })
  providerKeyLabel!: string | null;
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

// ── Paginated query DTOs ────────────────────────────────────────────

/** A page of models returned by the queryable models endpoint. */
export class ModelPageDto {
  @ApiProperty({ type: [UserModelDto] })
  items!: UserModelDto[];

  @ApiProperty({ type: Number, description: 'Current page number (1-based).' })
  page!: number;

  @ApiProperty({ type: Number, description: 'Number of items per page.' })
  perPage!: number;

  @ApiProperty({ type: Number, description: 'Total number of matching items across all pages.' })
  total!: number;
}

/** Describes one filterable column and its allowed operators. */
export class FilterColumnInfoDto {
  @ApiProperty({
    example: 'displayName',
    description: 'Column name in the API, usable as a JSON `filter` key.',
  })
  field!: string;

  @ApiProperty({
    example: ['eq', 'like'],
    description: 'Operators usable on this column: eq, gt, gte, lt, lte, like, in.',
  })
  operators!: string[];
}

/** Describes one sortable column. */
export class SortColumnInfoDto {
  @ApiProperty({
    example: 'displayName',
    description: 'Column name in the API, usable in the `sort` param.',
  })
  field!: string;

  @ApiProperty({ example: 'desc', description: 'Default sort direction.' })
  defaultDirection!: string;
}

/**
 * Returned by `GET /api/v1/models/query-config` — shows Swagger users
 * (and the client) exactly which columns are filterable/sortable and with
 * which operators. This makes the dynamic JSON filter schema discoverable.
 */
export class ModelQueryInfoDto {
  @ApiProperty({
    type: [FilterColumnInfoDto],
    description: 'Columns available for JSON `filter` param, with their allowed operators.',
    example: [
      { field: 'enabled', operators: ['eq'] },
      { field: 'displayName', operators: ['eq', 'like'] },
      { field: 'intelligenceScore', operators: ['eq', 'gt', 'gte', 'lt', 'lte'] },
    ],
  })
  filterableColumns!: FilterColumnInfoDto[];

  @ApiProperty({
    type: [SortColumnInfoDto],
    description: 'Columns available for `sort` param.',
    example: [
      { field: 'id', defaultDirection: 'desc' },
      { field: 'displayName', defaultDirection: 'desc' },
    ],
  })
  sortableColumns!: SortColumnInfoDto[];

  @ApiProperty({ example: 1, description: 'Default page number.' })
  defaultPage!: number;

  @ApiProperty({ example: 20, description: 'Default items per page.' })
  defaultPerPage!: number;

  @ApiProperty({ example: 100, description: 'Maximum allowed items per page.' })
  maxPerPage!: number;
}
