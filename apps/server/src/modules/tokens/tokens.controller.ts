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
import { TokensService } from './tokens.service.js';
import type { ApiTokenMetadata } from './api-token.repository.js';
import { ApiTokenDto, CreateTokenDto, CreateTokenResponseDto } from './dto/token.dto.js';

/** Manages a user's LLM API tokens (`sqr-llm-…`) used by the `/v1` gateway. JWT-guarded. */
@ApiTags('tokens')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('tokens')
export class TokensController {
  constructor(private readonly tokens: TokensService) {}

  @Post()
  @ApiOperation({ summary: 'Create an LLM API token; the plaintext is returned exactly once.' })
  @ApiCreatedResponse({ type: CreateTokenResponseDto })
  create(
    @CurrentUser() user: Principal,
    @Body() dto: CreateTokenDto,
  ): Promise<CreateTokenResponseDto> {
    return this.tokens.create(user.id, dto.name);
  }

  @Get()
  @ApiOperation({ summary: "List the caller's tokens — metadata only, never the secret." })
  @ApiOkResponse({ type: ApiTokenDto, isArray: true })
  list(@CurrentUser() user: Principal): Promise<ApiTokenMetadata[]> {
    return this.tokens.list(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke one of the caller's tokens." })
  @ApiOkResponse({ description: 'Whether a matching, owned token was revoked.' })
  async revoke(
    @CurrentUser() user: Principal,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ revoked: boolean }> {
    return { revoked: await this.tokens.revoke(user.id, id) };
  }
}
