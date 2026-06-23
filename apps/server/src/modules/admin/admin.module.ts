import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { AdminSettingsController, AdminUsersController } from './admin.controller.js';
import { AdminUsersService } from './admin-users.service.js';

/**
 * Admin governance (TASK-075): global settings + user management, all behind `JwtAuthGuard` +
 * `RolesGuard` (`admin`). Imports {@link AuthModule} for `UsersRepository` + `AuthService` (hashed
 * account creation) and {@link SettingsModule} for the typed settings store.
 */
@Module({
  imports: [AuthModule, SettingsModule],
  controllers: [AdminSettingsController, AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminModule {}
