import type { AdminMenuItem } from '../AdminShell';
import type { NubitAppMenuItem } from './types';

export function hasAnyRole(required: string | string[] | undefined, roles: string[]): boolean {
  if (required === undefined) {
    return true;
  }

  const needed = Array.isArray(required) ? required : [required];

  return needed.some((role) => roles.includes(role));
}

/**
 * Removes menu entries whose `roles` constraint is not satisfied. Sub-items with
 * `roles` are filtered; empty parent groups are dropped.
 */
export function filterMenuByRoles(items: NubitAppMenuItem[], roles: string[]): AdminMenuItem[] {
  const filtered: AdminMenuItem[] = [];

  for (const item of items) {
    if (!hasAnyRole(item.roles, roles)) {
      continue;
    }

    if (!item.items) {
      filtered.push({ text: item.text, path: item.path, icon: item.icon });
      continue;
    }

    const subItems = item.items
      .filter((subItem) => hasAnyRole(subItem.roles, roles))
      .map(({ text, path }) => ({ text, path }));

    if (subItems.length === 0) {
      continue;
    }

    filtered.push({
      text: item.text,
      icon: item.icon,
      path: item.path,
      items: subItems,
    });
  }

  return filtered;
}

export function resolveAppMenu(
  menu: NubitAppMenuItem[] | ((ctx: import('./types').NubitAppMenuContext) => NubitAppMenuItem[]),
  ctx: import('./types').NubitAppMenuContext,
): NubitAppMenuItem[] {
  return typeof menu === 'function' ? menu(ctx) : menu;
}