import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { ModelsService, type FetchModelsResult, type ModelView } from './models.service.js';
import {
  CreateCustomModelDto,
  FetchModelsResultDto,
  UpdateUserModelDto,
  UserModelDto,
} from './dto/model.dto.js';

/** On-demand model discovery + per-user model catalog. JWT-guarded management API. */
@ApiTags('models')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller()
export class ModelsController {
  constructor(private readonly models: ModelsService) {}

  @Post('providers/keys/:keyId/fetch-models')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Discover the provider's models for this key and upsert them (free enabled by default).",
  })
  @ApiOkResponse({ type: FetchModelsResultDto })
  fetchModels(
    @CurrentUser() user: Principal,
    @Param('keyId', ParseIntPipe) keyId: number,
  ): Promise<FetchModelsResult> {
    return this.models.fetchModelsForKey(user.id, keyId);
  }

  @Get('models')
  @ApiOperation({ summary: "List the caller's model catalog with enabled flags." })
  @ApiOkResponse({ type: UserModelDto, isArray: true })
  list(@CurrentUser() user: Principal): Promise<ModelView[]> {
    return this.models.listForUser(user.id);
  }

  @Patch('models/:userModelId')
  @ApiOperation({ summary: 'Enable/disable a model or set cost/capability overrides.' })
  @ApiOkResponse({ description: 'The updated enable state.' })
  updateModel(
    @CurrentUser() user: Principal,
    @Param('userModelId', ParseIntPipe) userModelId: number,
    @Body() dto: UpdateUserModelDto,
  ): Promise<{ id: number; enabled: boolean }> {
    return this.models.updateUserModel(user.id, userModelId, dto);
  }

  @Post('models/custom')
  @ApiOperation({ summary: 'Add a fully-custom model under a provider.' })
  @ApiCreatedResponse({ type: UserModelDto })
  addCustom(@CurrentUser() user: Principal, @Body() dto: CreateCustomModelDto): Promise<ModelView> {
    return this.models.addCustomModel(user.id, dto);
  }

  @Delete('models/custom/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove one of the caller's custom models." })
  @ApiOkResponse({ description: 'Whether a matching custom model was removed.' })
  async removeCustom(
    @CurrentUser() user: Principal,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ removed: boolean }> {
    return { removed: await this.models.removeCustomModel(user.id, id) };
  }
}
