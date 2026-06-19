import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { users, type Db } from '../../database/index.js';
import { DB } from '../../database/database.module.js';
import { BaseRepository } from '../../common/db/base.repository.js';

/** Persistence for `users`, adding the auth-specific `findByEmail` lookup. */
@Injectable()
export class UsersRepository extends BaseRepository<typeof users> {
  constructor(@Inject(DB) db: Db) {
    super(db, users, true); // users compose baseEntityColumns -> soft-deletable
  }

  /** Finds an active (non-deleted) user by email, or `undefined`. */
  async findByEmail(email: string): Promise<typeof users.$inferSelect | undefined> {
    const rows = await this.exec()
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);
    return rows[0];
  }
}
