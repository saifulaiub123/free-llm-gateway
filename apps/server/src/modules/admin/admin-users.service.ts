import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import {
  UsersRepository,
  type AdminUserPage,
  type AdminUserView,
} from '../auth/users.repository.js';

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

/** Patch for an admin user update: role and/or enabled flag. */
export interface AdminUserPatch {
  role?: 'admin' | 'user';
  isActive?: boolean;
}

/**
 * Admin operations over the user directory (TASK-075). Reuses {@link UsersRepository} for reads/writes
 * and {@link AuthService.createAccount} for hashed account creation, and protects the last admin so an
 * install can never lock out all administrators.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly auth: AuthService,
  ) {}

  /** Lists users newest-first (keyset pagination), projected without password hashes. */
  list(cursor?: number, limit?: number): Promise<AdminUserPage> {
    return this.users.listPage(this.resolveLimit(limit), cursor);
  }

  /** Creates a user (admin path — bypasses the self-registration gate). */
  create(email: string, password: string, role: 'admin' | 'user'): Promise<AdminUserView> {
    return this.auth.createAccount(email, password, role) as Promise<AdminUserView>;
  }

  /** Updates a user's role and/or enabled flag, guarding the last remaining admin. */
  async update(id: number, patch: AdminUserPatch): Promise<AdminUserView> {
    const target = await this.users.findById(id);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    await this.guardLastAdmin(target, patch);
    const updated = await this.users.update(id, patch);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    };
  }

  /** Rejects a change that would demote or disable the last active admin. */
  private async guardLastAdmin(
    target: { role: string; isActive: boolean },
    patch: AdminUserPatch,
  ): Promise<void> {
    if (target.role !== 'admin') {
      return;
    }
    const demoting = patch.role !== undefined && patch.role !== 'admin';
    const disabling = patch.isActive === false;
    if (!demoting && !disabling) {
      return;
    }
    if ((await this.users.countActiveAdmins()) <= 1) {
      throw new BadRequestException('Cannot demote or disable the last remaining admin');
    }
  }

  /** Clamps the page size into `[1, MAX_PAGE_LIMIT]`. */
  private resolveLimit(limit?: number): number {
    if (limit === undefined || Number.isNaN(limit) || limit < 1) {
      return DEFAULT_PAGE_LIMIT;
    }
    return Math.min(limit, MAX_PAGE_LIMIT);
  }
}
