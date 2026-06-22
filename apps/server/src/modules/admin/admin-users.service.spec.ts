import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service.js';
import type { UsersRepository } from '../auth/users.repository.js';
import type { AuthService } from '../auth/auth.service.js';

function build() {
  const listPage = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
  const findById = vi.fn();
  const update = vi.fn();
  const countActiveAdmins = vi.fn();
  const users = { listPage, findById, update, countActiveAdmins } as unknown as UsersRepository;
  const createAccount = vi.fn();
  const auth = { createAccount } as unknown as AuthService;
  return {
    service: new AdminUsersService(users, auth),
    listPage,
    findById,
    update,
    countActiveAdmins,
    createAccount,
  };
}

const adminRow = { id: 1, role: 'admin', isActive: true, email: 'a@b.com', createdAt: new Date() };

describe('AdminUsersService (TASK-075)', () => {
  it('clamps the page limit when listing', async () => {
    const { service, listPage } = build();
    await service.list(10, 5000);
    expect(listPage).toHaveBeenCalledWith(200, 10);
  });

  it('delegates user creation to the hashed admin-create path', async () => {
    const { service, createAccount } = build();
    createAccount.mockResolvedValue({ id: 2, email: 'x@y.com', role: 'user', isActive: true });
    await service.create('x@y.com', 'password123', 'user');
    expect(createAccount).toHaveBeenCalledWith('x@y.com', 'password123', 'user');
  });

  it('throws NotFound when updating a missing user', async () => {
    const { service, findById } = build();
    findById.mockResolvedValue(undefined);
    await expect(service.update(99, { isActive: false })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to demote or disable the last remaining admin', async () => {
    const { service, findById, countActiveAdmins } = build();
    findById.mockResolvedValue(adminRow);
    countActiveAdmins.mockResolvedValue(1);

    await expect(service.update(1, { role: 'user' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update(1, { isActive: false })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows demoting an admin when another active admin remains', async () => {
    const { service, findById, update, countActiveAdmins } = build();
    findById.mockResolvedValue(adminRow);
    countActiveAdmins.mockResolvedValue(2);
    update.mockResolvedValue({ ...adminRow, role: 'user' });

    const result = await service.update(1, { role: 'user' });
    expect(result.role).toBe('user');
    expect(update).toHaveBeenCalledWith(1, { role: 'user' });
  });

  it('does not guard when the target is not an admin', async () => {
    const { service, findById, update, countActiveAdmins } = build();
    findById.mockResolvedValue({ ...adminRow, id: 5, role: 'user' });
    update.mockResolvedValue({ ...adminRow, id: 5, role: 'user', isActive: false });

    await service.update(5, { isActive: false });
    expect(countActiveAdmins).not.toHaveBeenCalled();
  });
});
