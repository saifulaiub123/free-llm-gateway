import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

/**
 * Provides the shared {@link DatabaseService} to the whole app.
 *
 * WHY `@Global`: every repository injects the same DatabaseService, so exposing it globally avoids
 * re-importing this module everywhere. The concrete provider is chosen by `DB_PROVIDER`, keeping the
 * server framework-agnostic about the database.
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
