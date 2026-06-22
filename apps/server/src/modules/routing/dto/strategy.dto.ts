import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const STRATEGY_TYPES = ['manual', 'free_first', 'balanced', 'fastest', 'smart'] as const;

/** Create a routing strategy. */
export class CreateStrategyDto {
  @ApiProperty({ enum: STRATEGY_TYPES })
  @IsIn(STRATEGY_TYPES)
  type!: (typeof STRATEGY_TYPES)[number];

  @ApiProperty({ example: 'My Balanced' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ required: false, type: Object, description: 'StrategyConfig (weights / manual mode).' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

/** Patch a strategy's name and/or config. */
export class UpdateStrategyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

/** Replace just the strategy config. */
export class StrategyConfigDto {
  @ApiProperty({ type: Object, description: 'StrategyConfig (weights / manual sub-mode / filters).' })
  @IsObject()
  config!: Record<string, unknown>;
}

/** One position in a strategy's saved order. */
export class ReorderItemDto {
  @ApiProperty()
  @IsInt()
  userModelId!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/** Replace a strategy's saved model order (drag reorder). */
export class ReorderDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}

/** A routing strategy as returned to the dashboard (config parsed from storage). */
export class StrategyDto {
  @ApiProperty() id!: number;
  @ApiProperty({ enum: STRATEGY_TYPES }) type!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: Object }) config!: Record<string, unknown>;
  @ApiProperty() isDefault!: boolean;
}
