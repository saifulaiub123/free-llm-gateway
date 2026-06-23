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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUser as Principal } from '../auth/auth.types.js';
import { ModelsService, type FetchModelsResult, type ModelView } from './models.service.js';
import {
  CreateCustomModelDto,
  FetchModelsResultDto,
  ModelPageDto,
  ModelQueryInfoDto,
  UpdateUserModelDto,
  UserModelDto,
} from './dto/model.dto.js';
import { ModelQuerySchema } from './dto/model-query.schema.js';
import type { ModelQuery } from './dto/model-query.schema.js';
import { modelFilterConfig, modelSortableColumns } from './dto/model-query.schema.js';

/**
 * Composed Swagger decorator for the list() query parameters.
 *
 * WHY manual composition over `applyDecorators`: `@nestjs/swagger` decorators
 * rely on `Reflect.defineMetadata` at decoration time, and `applyDecorators`
 * from `@nestjs/common` can interfere with that in test/vite environments.
 * Manually chaining the decorator factories avoids the issue.
 */
function ApiQueryModelsList(): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    ApiQuery({
      name: 'page',
      type: Number,
      required: false,
      example: 1,
      description: 'Page number (1-based).',
    })(target, propertyKey, descriptor);
    ApiQuery({
      name: 'per_page',
      type: Number,
      required: false,
      example: 20,
      description: 'Items per page (max 200).',
    })(target, propertyKey, descriptor);
    ApiQuery({
      name: 'filter',
      type: String,
      required: false,
      description:
        'JSON filter object. See @ApiOperation description for filterable columns and operators.',
      example: '{"enabled":true,"displayName__like":"gpt"}',
    })(target, propertyKey, descriptor);
    ApiQuery({
      name: 'sort',
      type: String,
      required: false,
      description: 'Column name and direction. See @ApiOperation for sortable columns.',
      example: 'displayName:asc',
    })(target, propertyKey, descriptor);
  };
}

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

  @Get('models/query-config')
  @ApiOperation({
    summary: 'Get filterable/sortable column configuration for the models endpoint.',
    description:
      'Returns the full column whitelist with allowed operators — useful for both Swagger consumers and dynamic filter UIs in the client.',
  })
  @ApiOkResponse({ type: ModelQueryInfoDto })
  getQueryConfig(): ModelQueryInfoDto {
    const filterableColumns = Object.entries(modelFilterConfig).map(
      ([field, cfg]) => ({
        field,
        operators: [...cfg.operators],
      }),
    );
    const sortableColumns = modelSortableColumns.map((field) => ({
      field,
      defaultDirection: 'desc',
    }));
    return {
      filterableColumns,
      sortableColumns,
      defaultPage: 1,
      defaultPerPage: 20,
      maxPerPage: 200,
    };
  }

  @Get('models')
  @ApiOperation({
    summary: 'Query models with dynamic filter, sort, search, and pagination.',
    description: `
**Filterable columns** (use JSON \`filter\` param):
- \`enabled\` — eq
- \`isCustom\` — eq
- \`customProviderId\` — eq
- \`providerId\` — eq
- \`isFree\` — eq
- \`displayName\` — eq, like
- \`speedTier\` — eq, in
- \`intelligenceScore\` — eq, gt, gte, lt, lte
- \`contextWindow\` — eq, gt, gte, lt, lte
- \`inputCostPer1m\` — eq, gte, lte
- \`outputCostPer1m\` — eq, gte, lte
- \`stabilityBaseline\` — eq, gte
- \`createdAt\` — gt, gte, lt, lte

**Sortable columns** (use \`sort\` param):
\`id\`, \`createdAt\`, \`enabled\`

**Examples** (click "Try it out"):
- \`?page=1&per_page=20\`
- \`?filter={"enabled":true}&sort=id:desc&page=1&per_page=20\`
- \`?filter={"displayName__like":"gpt"}&per_page=20\`
    `,
  })
  @ApiOkResponse({ type: ModelPageDto })
  @ApiQueryModelsList()
  list(
    @CurrentUser() user: Principal,
    @Query(new ZodValidationPipe(ModelQuerySchema)) query: ModelQuery,
  ): Promise<ModelPageDto> {
    return this.models.listForUserPage(user.id, query);
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
