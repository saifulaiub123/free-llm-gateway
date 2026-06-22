import { Module } from '@nestjs/common';
import { SettingsRepository } from './settings.repository.js';
import { SettingsService } from './settings.service.js';

/**
 * Generic typed settings substrate (TASK-072). Owns the `settings` key/value store and the
 * code-declared Settings Registry. Exports {@link SettingsService} so auth (registration gating) and
 * the admin module can read/write settings without re-providing the repository.
 */
@Module({
  providers: [SettingsRepository, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
