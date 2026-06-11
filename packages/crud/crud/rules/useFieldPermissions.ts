import { useMemo } from 'react';
import type { Field } from '../../field/Field';

/**
 * Filters and marks fields based on user roles.
 * IMPORTANT: This is UI-only. Backend is the real authorization source.
 *
 * - If field.permissions.visible is set and userRoles has no intersection → filter out the field
 * - If field.permissions.editable is set and userRoles has no intersection → mark field as disabled
 *
  * Identity fields (isIdentity === true) are always kept regardless of permissions
  * so grids and forms can resolve row keys consistently.
 */
export function useFieldPermissions(fields: Field[], userRoles: string[]): Field[] {
  return useMemo(() => {
    return fields.reduce<Field[]>((acc, field) => {
      // Identity fields (e.g. the hidden "id") must always be present so UI
      // components can resolve row keys correctly.
      if (field.isIdentity) {
        acc.push(field);
        return acc;
      }

      const perms = field.permissions;
      if (!perms) {
        acc.push(field);
        return acc;
      }
      if (perms.visible && !perms.visible.some((r) => userRoles.includes(r))) {
        return acc; // omit the field entirely
      }
      if (perms.editable && !perms.editable.some((r) => userRoles.includes(r))) {
        // RBAC disabled is absolute: the user lacks the required role, so the field
        // is unconditionally disabled. Any existing `disabledWhen` is intentionally
        // superseded — role-based restrictions always take precedence over
        // data-driven conditional rules.
        acc.push({ ...field, disabledWhen: () => true });
        return acc;
      }
      acc.push(field);
      return acc;
    }, []);
  }, [fields, userRoles]);
}
