import { describe, expect, it } from 'vitest';
import { hasRoleAtLeast } from './roles';

describe('hasRoleAtLeast', () => {
  it('follows the member < board < admin hierarchy', () => {
    expect(hasRoleAtLeast('member', 'member')).toBe(true);
    expect(hasRoleAtLeast('board', 'member')).toBe(true);
    expect(hasRoleAtLeast('admin', 'board')).toBe(true);
    expect(hasRoleAtLeast('member', 'board')).toBe(false);
    expect(hasRoleAtLeast('board', 'admin')).toBe(false);
  });

  it('gives no access without a role', () => {
    expect(hasRoleAtLeast(null, 'member')).toBe(false);
    expect(hasRoleAtLeast(undefined, 'member')).toBe(false);
  });
});
