import { Global, Module } from '@nestjs/common';
import { createDb, type Db } from './index.js';

/** DI token for the shared Drizzle database handle. */
export const DB = Symbol('DB');

/**
 * Provides the single driver-agnostic Drizzle client to the whole app.
 *
 * WHY `@Global`: every repository injects the same `Db` instance, so exposing it globally avoids
 * re-importing this module everywhere. The concrete provider is chosen by the database module's
 * `createDb()` from `DB_PROVIDER`, keeping the server framework-agnostic about the database.
 */
@Global()
@Module({
  providers: [{ provide: DB, useFactory: (): Db => createDb() }],
  exports: [DB],
})
export class DatabaseModule {}
