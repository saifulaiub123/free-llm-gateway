import { Global, Module } from '@nestjs/common';
import { createDb, type Db } from '@gateway/db';

/** DI token for the shared Drizzle database handle. */
export const DB = Symbol('DB');

/**
 * Provides the single driver-agnostic Drizzle client to the whole app.
 *
 * WHY `@Global`: every repository injects the same `Db` instance, so exposing it globally avoids
 * re-importing this module everywhere. The concrete driver is chosen by `@gateway/db`'s
 * `createDb()` from `DB_DRIVER`, keeping the server framework-agnostic about the database.
 */
@Global()
@Module({
  providers: [{ provide: DB, useFactory: (): Db => createDb() }],
  exports: [DB],
})
export class DatabaseModule {}
