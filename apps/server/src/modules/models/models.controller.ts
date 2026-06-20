import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUser as Principal } from '../auth/auth.types.js';
import { ModelsService, type FetchModelsResult } from './models.service.js';
import { FetchModelsResultDto } from './dto/model.dto.js';

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
}
