import { afterEach, describe, expect, it } from 'vitest';
import { userInformation } from './UserInformation';

afterEach(() => localStorage.clear());

describe('userInformation', () => {
  it('returns empty defaults when nothing is stored', () => {
    expect(userInformation()).toEqual({
      currentUserId: undefined,
      currentUserName: '',
      currentUserRoleId: undefined,
      currentBranchId: '',
      currentBranchName: '',
    });
  });

  it('reads the stored user and branch', () => {
    localStorage.setItem('user', JSON.stringify({ userId: 7, username: 'ana', role: 2 }));
    localStorage.setItem('selectedBranchId', JSON.stringify('b-1'));
    localStorage.setItem('selectedBranchName', JSON.stringify('Main'));

    expect(userInformation()).toEqual({
      currentUserId: 7,
      currentUserName: 'ana',
      currentUserRoleId: 2,
      currentBranchId: 'b-1',
      currentBranchName: 'Main',
    });
  });

  it('survives corrupt JSON instead of throwing during render', () => {
    localStorage.setItem('user', '{not json');

    expect(userInformation().currentUserName).toBe('');
  });
});
