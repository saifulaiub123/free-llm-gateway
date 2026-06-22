import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUser as Principal } from '../auth/auth.types.js';
import { StrategiesService, type StrategyView } from './strategies.service.js';
import type { StrategyType } from './types/routing-candidate.js';
import {
  CreateStrategyDto,
  ReorderDto,
  StrategyConfigDto,
  StrategyDto,
  UpdateStrategyDto,
} from './dto/strategy.dto.js';

/** Per-user routing strategy management. JWT-guarded; every action is scoped to the caller. */
@ApiTags('strategies')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('strategies')
export class StrategiesController {
  constructor(private readonly strategies: StrategiesService) {}

  @Get()
  @ApiOperation({ summary: "List the caller's routing strategies." })
  @ApiOkResponse({ type: StrategyDto, isArray: true })
  list(@CurrentUser() user: Principal): Promise<StrategyView[]> {
    return this.strategies.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a routing strategy.' })
  @ApiCreatedResponse({ type: StrategyDto })
  create(@CurrentUser() user: Principal, @Body() dto: CreateStrategyDto): Promise<StrategyView> {
    return this.strategies.create(user.id, {
      type: dto.type as StrategyType,
      name: dto.name,
      ...(dto.config !== undefined ? { config: dto.config } : {}),
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a strategy's name and/or config." })
  @ApiOkResponse({ type: StrategyDto })
  update(
    @CurrentUser() user: Principal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStrategyDto,
  ): Promise<StrategyView> {
    return this.strategies.update(user.id, id, dto);
  }

  @Put(':id/order')
  @ApiOperation({ summary: 'Replace the saved model order for a strategy (drag reorder).' })
  @ApiOkResponse({ description: 'How many positions were saved.' })
  setOrder(
    @CurrentUser() user: Principal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderDto,
  ): Promise<{ updated: number }> {
    return this.strategies.setOrder(user.id, id, dto.items);
  }

  @Patch(':id/config')
  @ApiOperation({ summary: "Replace a strategy's config (weights / manual sub-mode / filters)." })
  @ApiOkResponse({ type: StrategyDto })
  updateConfig(
    @CurrentUser() user: Principal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StrategyConfigDto,
  ): Promise<StrategyView> {
    return this.strategies.updateConfig(user.id, id, dto.config);
  }

  @Put(':id/default')
  @ApiOperation({ summary: "Set the caller's default routing strategy." })
  @ApiOkResponse({ description: 'The new default strategy id.' })
  setDefault(
    @CurrentUser() user: Principal,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ default: number }> {
    return this.strategies.setDefault(user.id, id);
  }
}
