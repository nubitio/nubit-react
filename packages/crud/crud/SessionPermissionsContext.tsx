import React, { createContext, useCallback, useContext, useMemo } from 'react';

/** A money limit as `GET /api/me` publishes it. */
export interface PermissionLimit {
  amount: string;
  currency: string;
  scale: number;
  minorAmount: number;
}

export interface SessionPermissions {
  /** Effective permission names, e.g. `invoice.approve`. */
  permissions: string[];
  /** Permission name → the amount it is capped at. */
  limits: Record<string, PermissionLimit>;
}

const EMPTY: SessionPermissions = { permissions: [], limits: {} };

const SessionPermissionsContext = createContext<SessionPermissions>(EMPTY);

/**
 * Carries the permissions the session reported.
 *
 * This decides what the UI *offers*, never what the API allows. The backend
 * evaluates the same permissions in a voter, so a client that ignores this list
 * gets a 403 rather than a result — which is the only arrangement in which
 * showing a button and enforcing a rule can safely be two different pieces of
 * code.
 */
export function SessionPermissionsProvider({
  children,
  permissions,
  limits,
}: React.PropsWithChildren<Partial<SessionPermissions>>) {
  const value = useMemo<SessionPermissions>(
    () => ({ permissions: permissions ?? [], limits: limits ?? {} }),
    [permissions, limits],
  );

  return (
    <SessionPermissionsContext.Provider value={value}>
      {children}
    </SessionPermissionsContext.Provider>
  );
}

export function useSessionPermissions(): SessionPermissions {
  return useContext(SessionPermissionsContext);
}

/**
 * Whether the session holds a permission.
 *
 * An empty permission list means "the backend published none", which happens
 * whenever the authorization module is off. Treating that as "denies
 * everything" would blank out every screen of an application that never opted
 * in, so it reads as "not in use" and defers to the older role checks.
 */
export function useHasPermission(): (permission: string) => boolean {
  const { permissions } = useSessionPermissions();

  const held = useMemo(
    () => new Set(permissions.map((permission) => permission.toLowerCase())),
    [permissions],
  );

  return useCallback(
    (permission: string) => held.size === 0 || held.has(permission.toLowerCase()),
    [held],
  );
}
