import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { settings, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';

/** Settings scope: a per-user override or a global default. */
export type SettingScope = 'user' | 'global';

/** Persistence for the scoped `settings` key/value store. */
@Injectable()
export class SettingsRepository extends BaseRepository<typeof settings> {
  constructor(database: DatabaseService) {
    super(database, settings, false); // config store composes baseColumns only
  }

  /** Reads the raw JSON value for a `(scope, key[, userId])`, or `undefined`. */
  async findValue(scope: SettingScope, key: string, userId?: number): Promise<string | undefined> {
    const ownership =
      userId !== undefined ? eq(settings.userId, userId) : isNull(settings.userId);
    const rows = await this.exec()
      .select({ value: settings.value })
      .from(settings)
      .where(and(eq(settings.scope, scope), eq(settings.key, key), ownership))
      .limit(1);
    return rows[0]?.value;
  }

  /**
   * Inserts or updates a setting's value (app-level upsert — no transaction so it stays portable on
   * libSQL `:memory:`). Logical uniqueness of `(scope, key, userId)` is enforced here.
   */
  async upsert(
    scope: SettingScope,
    key: string,
    value: string,
    userId?: number,
  ): Promise<void> {
    const ownership =
      userId !== undefined ? eq(settings.userId, userId) : isNull(settings.userId);
    const existing = await this.exec()
      .select({ id: settings.id })
      .from(settings)
      .where(and(eq(settings.scope, scope), eq(settings.key, key), ownership))
      .limit(1);
    if (existing[0]) {
      await this.exec().update(settings).set({ value }).where(eq(settings.id, existing[0].id));
      return;
    }
    await this.exec().insert(settings).values({ scope, key, value, userId: userId ?? null });
  }
}
