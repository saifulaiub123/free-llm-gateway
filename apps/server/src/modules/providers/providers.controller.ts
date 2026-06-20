import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { ProvidersService } from './providers.service.js';
import { AddKeyDto, ProviderDto, ProviderKeyDto } from './dto/provider.dto.js';
import type { ProviderKeyMetadata } from './user-provider-key.repository.js';
import type { providers } from '../../database/index.js';

/** Provider catalog browsing + per-user encrypted key management. JWT-guarded management API. */
@ApiTags('providers')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'List the global provider catalog (seeded; no models).' })
  @ApiOkResponse({ type: ProviderDto, isArray: true })
  listCatalog(): Promise<(typeof providers.$inferSelect)[]> {
    return this.providers.listCatalog();
  }

  @Post(':providerKey/keys')
  @ApiOperation({ summary: 'Add a provider API key (validated upstream, then encrypted at rest).' })
  @ApiCreatedResponse({ type: ProviderKeyDto })
  addKey(
    @CurrentUser() user: Principal,
    @Param('providerKey') providerKey: string,
    @Body() dto: AddKeyDto,
  ): Promise<ProviderKeyMetadata> {
    return this.providers.addKey(user.id, providerKey, dto.apiKey, dto.label);
  }

  @Get('keys')
  @ApiOperation({ summary: "List the caller's provider keys (metadata only — never the secret)." })
  @ApiOkResponse({ type: ProviderKeyDto, isArray: true })
  listKeys(@CurrentUser() user: Principal): Promise<ProviderKeyMetadata[]> {
    return this.providers.listKeys(user.id);
  }

  @Delete('keys/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove one of the caller's provider keys." })
  @ApiOkResponse({ description: 'Whether a matching, owned key was removed.' })
  async removeKey(
    @CurrentUser() user: Principal,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ removed: boolean }> {
    return { removed: await this.providers.removeKey(user.id, id) };
  }
}
