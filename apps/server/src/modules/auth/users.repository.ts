import { Injectable } from '@nestjs/common';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { users, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';

/** A user row projected for the admin list (never exposes the password hash). */
export interface AdminUserView {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

/** One page of admin users plus the next keyset cursor. */
export interface AdminUserPage {
  items: AdminUserView[];
  nextCursor: number | null;
}

/** Persistence for `users`, adding the auth-specific `findByEmail` lookup. */
@Injectable()
export class UsersRepository extends BaseRepository<typeof users> {
  constructor(database: DatabaseService) {
    super(database, users, true); // users compose baseEntityColumns -> soft-deletable
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

  /** Returns one page of users (newest-first, keyset on id) projected without secrets. */
  async listPage(limit: number, cursor?: number): Promise<AdminUserPage> {
    const predicate = cursor
      ? and(eq(users.isDeleted, false), lt(users.id, cursor))
      : eq(users.isDeleted, false);
    const rows = await this.exec()
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(predicate)
      .orderBy(desc(users.id))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    return { items, nextCursor };
  }

  /** Counts active (enabled, non-deleted) admins — used to protect the last admin. */
  async countActiveAdmins(): Promise<number> {
    const rows = await this.exec()
      .select({ value: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.isActive, true), eq(users.isDeleted, false)));
    return Number(rows[0]?.value ?? 0);
  }
}
