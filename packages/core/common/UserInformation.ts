interface StoredUser {
  userId?: string | number;
  username?: string;
  role?: number;
}

function getStoredItem<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null;

  const item = localStorage.getItem(key);
  if (!item) return null;

  try {
    return JSON.parse(item) as T;
  } catch {
    return null;
  }
}

export const userInformation = () => {
  const user = getStoredItem<StoredUser>('user') ?? undefined;
  const currentUserId = user?.userId;
  const currentUserName = user?.username ?? '';
  const currentUserRoleId = user?.role;
  const currentBranchId = getStoredItem<string>('selectedBranchId') ?? '';
  const currentBranchName = getStoredItem<string>('selectedBranchName') ?? '';

  return {
    currentUserId,
    currentUserName,
    currentUserRoleId,
    currentBranchId,
    currentBranchName,
  };
};
