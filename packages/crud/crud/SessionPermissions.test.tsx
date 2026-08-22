import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SessionPermissionsProvider, useHasPermission } from './SessionPermissionsContext';
import { usePermissions } from './usePermissions';
import type { ResourceConfig } from './ResourceConfig';

function wrapperFor(permissions: string[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SessionPermissionsProvider permissions={permissions}>{children}</SessionPermissionsProvider>
    );
  };
}

const resource = (overrides: Partial<ResourceConfig> = {}): ResourceConfig =>
  ({ id: 'movements', url: '/api/stock_movements', ...overrides }) as ResourceConfig;

describe('useHasPermission', () => {
  it('answers from the session list', () => {
    const { result } = renderHook(() => useHasPermission(), {
      wrapper: wrapperFor(['movement.read', 'movement.create']),
    });

    expect(result.current('movement.read')).toBe(true);
    expect(result.current('movement.delete')).toBe(false);
  });

  it('ignores case, since a permission name is not a display string', () => {
    const { result } = renderHook(() => useHasPermission(), {
      wrapper: wrapperFor(['movement.read']),
    });

    expect(result.current('Movement.Read')).toBe(true);
  });

  /**
   * An empty list means the backend published none — the module is off. Reading
   * that as "denies everything" would blank out every screen of an application
   * that never opted in.
   */
  it('treats an empty list as "not in use" rather than "denies everything"', () => {
    const { result } = renderHook(() => useHasPermission(), { wrapper: wrapperFor([]) });

    expect(result.current('movement.read')).toBe(true);
  });
});

describe('usePermissions with a session', () => {
  it('hides actions the session does not grant', () => {
    const { result } = renderHook(
      () => usePermissions(resource({ permissionPrefix: 'movement' }), ['GET', 'POST', 'DELETE']),
      { wrapper: wrapperFor(['movement.read']) },
    );

    expect(result.current.canAdd).toBe(false);
    expect(result.current.canDelete).toBe(false);
  });

  it('shows actions the session grants', () => {
    const { result } = renderHook(
      () => usePermissions(resource({ permissionPrefix: 'movement' }), ['GET', 'POST']),
      { wrapper: wrapperFor(['movement.read', 'movement.create']) },
    );

    expect(result.current.canAdd).toBe(true);
  });

  /** The session says what the user may do; the HTTP methods only say what exists. */
  it('outranks the method inference', () => {
    const { result } = renderHook(
      () => usePermissions(resource({ permissionPrefix: 'movement' }), ['GET', 'POST', 'PATCH']),
      { wrapper: wrapperFor(['movement.read']) },
    );

    expect(result.current.canEdit).toBe(false);
  });

  /** An application may still close something the backend would allow. */
  it('does not outrank an explicit override', () => {
    const { result } = renderHook(
      () =>
        usePermissions(resource({ permissionPrefix: 'movement', permissions: { canAdd: false } }), [
          'GET',
          'POST',
        ]),
      { wrapper: wrapperFor(['movement.read', 'movement.create']) },
    );

    expect(result.current.canAdd).toBe(false);
  });

  /** A resource naming no prefix keeps the previous behaviour exactly. */
  it('falls back to the method inference without a prefix', () => {
    const { result } = renderHook(() => usePermissions(resource(), ['GET', 'POST']), {
      wrapper: wrapperFor(['movement.read']),
    });

    expect(result.current.canAdd).toBe(true);
    expect(result.current.canDelete).toBe(false);
  });
});
