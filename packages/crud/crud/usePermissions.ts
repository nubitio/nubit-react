import { useMemo } from 'react';
import type { ResourceConfig, ResourcePermissions } from './ResourceConfig';

export type { ResourcePermissions };

/** Fully-resolved, all-required permissions (guaranteed booleans). */
export interface ResolvedPermissions {
  canAdd: boolean;
  canEdit: boolean;
  canView: boolean;
  canDelete: boolean;
  canExport: boolean;
  canBulkDelete: boolean;
}

/** Resolve a single permission entry: callable → call it, boolean → use it, undefined → fallback. */
function resolve(value: boolean | (() => boolean) | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value === 'function') return value();
  return value;
}

/**
 * Derive permissions from `hydra:supportedOperation` method list.
 * Returns `undefined` for each permission when `supportedOperations` is empty
 * (signals "no info available — use the next fallback level").
 */
function fromOperations(
  supportedOperations: string[],
): { canAdd: boolean; canEdit: boolean; canDelete: boolean } | undefined {
  if (supportedOperations.length === 0) return undefined;
  return {
    canAdd: supportedOperations.includes('POST'),
    canEdit: supportedOperations.includes('PUT') || supportedOperations.includes('PATCH'),
    canDelete: supportedOperations.includes('DELETE'),
  };
}

/**
 * Resolves RBAC permissions for a resource with the following precedence
 * (highest → lowest):
 *   1. `resource.permissions.canX` — callable or boolean override
 *   2. inferred from `supportedOperations` (hydra:supportedOperation methods)
 *   3. platform defaults            — canAdd/Edit/Delete=true, canExport/BulkDelete=false
 *
 * Memoized on `resource.id` — stable reference across re-renders.
 */
export function usePermissions(
  resource: ResourceConfig,
  supportedOperations: string[] = [],
): ResolvedPermissions {
  // Stabilize the ops array as a sorted joined string so that a new [] reference
  // on every render (e.g. from a default parameter) does not break memoization.
  const opsKey = supportedOperations.slice().sort().join(',');


  return useMemo(() => {
    const p = resource.permissions;
    const inferred = fromOperations(supportedOperations);

    function resolveWithInferred(
      permValue: boolean | (() => boolean) | undefined,
      inferredValue: boolean | undefined,
      platformDefault: boolean,
    ): boolean {
      if (permValue !== undefined) return resolve(permValue, platformDefault);
      if (inferredValue !== undefined) return inferredValue;
      return platformDefault;
    }

    return {
      canAdd: resolveWithInferred(p?.canAdd, inferred?.canAdd, true),
      canEdit: resolveWithInferred(p?.canEdit, inferred?.canEdit, true),
      canView: resolve(p?.canView, false),
      canDelete: resolveWithInferred(p?.canDelete, inferred?.canDelete, true),
      canExport: resolve(p?.canExport, false),
      canBulkDelete: resolve(p?.canBulkDelete, false),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource.id, opsKey, resource.permissions]);
}
