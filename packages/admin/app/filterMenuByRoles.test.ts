import { describe, expect, it } from 'vitest';
import { filterMenuByRoles, hasAnyRole } from './filterMenuByRoles';

describe('hasAnyRole', () => {
  it('allows entries without a roles constraint', () => {
    expect(hasAnyRole(undefined, ['ROLE_USER'])).toBe(true);
  });

  it('matches when any required role is present', () => {
    expect(hasAnyRole(['ROLE_ADMIN', 'ROLE_KITCHEN'], ['ROLE_USER', 'ROLE_ADMIN'])).toBe(true);
  });
});

describe('filterMenuByRoles', () => {
  it('drops items and sub-items the user cannot see', () => {
    const menu = filterMenuByRoles(
      [
        { text: 'Panel', path: '/dashboard' },
        { text: 'Admin', roles: 'ROLE_ADMIN', items: [{ text: 'Users', path: '/users' }] },
        {
          text: 'Ops',
          items: [
            { text: 'Orders', path: '/orders' },
            { text: 'Kitchen', path: '/kitchen', roles: 'ROLE_KITCHEN' },
          ],
        },
      ],
      ['ROLE_USER'],
    );

    expect(menu).toEqual([
      { text: 'Panel', path: '/dashboard', icon: undefined },
      { text: 'Ops', path: undefined, icon: undefined, items: [{ text: 'Orders', path: '/orders' }] },
    ]);
  });
});