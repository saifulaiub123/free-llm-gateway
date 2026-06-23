import { describe, expect, it } from 'vitest';
import { apiTokens } from '../../database/index.js';
import { ownerScope } from './owner-scope.js';

describe('ownerScope', () => {
  it('returns a user_id predicate for a regular user (per-user isolation, SEC-004)', () => {
    const predicate = ownerScope({ id: 9, role: 'user' }, apiTokens.userId);
    expect(predicate).toBeDefined();
  });

  it('returns undefined (no filter) for an admin (cross-user administration)', () => {
    const predicate = ownerScope({ id: 1, role: 'admin' }, apiTokens.userId);
    expect(predicate).toBeUndefined();
  });
});
