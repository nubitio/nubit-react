import { useMemo } from 'react';
import type { ResourceConfig, ResourcePermissions } from './ResourceConfig';
import { inferPermissionPrefix } from './inferPermissionPrefix';
import { useHasPermission, useSessionPermissions } from './SessionPermissionsContext';

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
 *   2. the session's granular permissions, when `permissionPrefix` is set and
 *      the backend published any
 *   3. inferred from `supportedOperations` (hydra:supportedOperation methods)
 *   4. platform defaults            — canAdd/Edit/Delete=true, canExport/BulkDelete=false
 *
 * The session sits above the HTTP-method inference on purpose: the methods say
 * what the resource *has*, the session says what this user may *do*, and only
 * the second one can hide a button that would come back a 403. It stays below
 * an explicit override so an application can still close something the backend
 * would allow.
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
  const hasPermission = useHasPermission();
  const { permissions: sessionPermissions } = useSessionPermissions();

  return useMemo(() => {
    const p = resource.permissions;
    const inferred = fromOperations(supportedOperations);
    // Infer the prefix only when the session published a permission list.
    // An empty list means the authorization module is off; inventing a prefix
    // would make `useHasPermission` treat every action as granted and skip
    // the HTTP-method inference that hid missing POST/PATCH/DELETE.
    const inferredPrefix = inferPermissionPrefix(resource.apiUrl);
    const prefix =
      resource.permissionPrefix ??
      (sessionPermissions.length > 0 && inferredPrefix !== '' ? inferredPrefix : undefined);

    /** Undefined when the resource names no prefix — "no opinion", not "denied". */
    function granted(action: string): boolean | undefined {
      return prefix === undefined ? undefined : hasPermission(`${prefix}.${action}`);
    }

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
      canAdd: resolveWithInferred(p?.canAdd, granted('create') ?? inferred?.canAdd, true),
      canEdit: resolveWithInferred(p?.canEdit, granted('update') ?? inferred?.canEdit, true),
      canView: resolve(p?.canView, false),
      canDelete: resolveWithInferred(p?.canDelete, granted('delete') ?? inferred?.canDelete, true),
      canExport: resolve(p?.canExport, false),
      canBulkDelete: resolve(p?.canBulkDelete, false),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resource.id,
    resource.apiUrl,
    opsKey,
    resource.permissions,
    resource.permissionPrefix,
    hasPermission,
    sessionPermissions,
  ]);
}
