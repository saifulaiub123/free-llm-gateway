import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../../common/guards/roles.guard.js';
import { SettingsService, type GlobalSettingView } from '../settings/settings.service.js';
import { isSettingKey, settingScope } from '../settings/settings.registry.js';
import {
  AdminUsersService,
  type AdminUserPatch,
} from './admin-users.service.js';
import type { AdminUserPage, AdminUserView } from '../auth/users.repository.js';
import { CreateUserDto, UpdateSettingDto, UpdateUserDto } from './dto/admin.dto.js';

/** Admin-only global settings management (TASK-075). */
@ApiTags('admin')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'List every global setting with its value + registry metadata.' })
  @ApiOkResponse({ description: 'Global settings for the admin UI.' })
  list(): Promise<GlobalSettingView[]> {
    return this.settings.listGlobal();
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update a global setting (validated against its registry schema).' })
  @ApiOkResponse({ description: 'The setting was updated.' })
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto): Promise<{ updated: true }> {
    if (!isSettingKey(key) || settingScope(key) !== 'global') {
      throw new BadRequestException(`Unknown global setting "${key}"`);
    }
    await this.settings.set(key, dto.value);
    return { updated: true };
  }
}

/** Admin-only user management (TASK-075). */
@ApiTags('admin')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (paginated, no password hashes).' })
  @ApiOkResponse({ description: 'One page of users plus the next cursor.' })
  list(@Query('cursor') cursor?: string, @Query('limit') limit?: string): Promise<AdminUserPage> {
    return this.users.list(
      cursor !== undefined ? Number(cursor) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a user even when self-registration is disabled.' })
  @ApiOkResponse({ description: 'The created user (no secrets).' })
  create(@Body() dto: CreateUserDto): Promise<AdminUserView> {
    return this.users.create(dto.email, dto.password, dto.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a user's role and/or enabled flag (protects the last admin)." })
  @ApiOkResponse({ description: 'The updated user.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<AdminUserView> {
    const patch: AdminUserPatch = {
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
    return this.users.update(id, patch);
  }
}
