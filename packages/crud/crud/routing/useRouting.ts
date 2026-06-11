import { useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { ResourceRouting } from '../ResourceConfig';

// Stable empty object — a fresh `{}` per render would invalidate every memo
// downstream (CrudPage → DataGridView source) and trigger grid reloads on
// unrelated re-renders such as form keystrokes.
const NO_FILTERS: Record<string, string> = {};

export interface RoutingState {
  /** id of record to open on mount, or null */
  initialRecordId: string | null;
  /** true when URL signals a new-record dialog */
  initialIsNew: boolean;
  /** current filter values read from URL query params */
  initialFilters: Record<string, string>;
  /** call this when filters change to sync them to URL */
  syncFilters: (filters: Record<string, string>) => void;
}

/**
 * Reads URL params and exposes helpers for SmartCrudPage to:
 * - Open the edit dialog for the record whose id is in the URL
 * - Open the add dialog when the URL contains the sentinel value "new"
 * - Sync grid filters to/from URL query params
 *
 * If `routing` is undefined, returns neutral defaults so the feature
 * is completely opt-in (no side-effects when routing is not configured).
 */
export function useRouting(routing: ResourceRouting | undefined): RoutingState {
  const params = useParams<Record<string, string>>();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialRecordId = (() => {
    if (!routing?.routeParam) return null;
    const value = params[routing.routeParam];
    if (!value || value === 'new') return null;
    return value;
  })();

  const initialIsNew = (() => {
    if (!routing?.routeParam) return false;
    const value = params[routing.routeParam];
    return value === 'new';
  })();

  const syncFiltersToUrl = routing?.syncFiltersToUrl ?? false;
  const initialFilters = useMemo(() => {
    if (!syncFiltersToUrl) return NO_FILTERS;
    const filters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      filters[key] = value;
    });
    return filters;
  }, [syncFiltersToUrl, searchParams]);

  const syncFilters = useCallback(
    (filters: Record<string, string>) => {
      if (!routing?.syncFiltersToUrl) return;
      const next = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) next.set(key, value);
      });
      setSearchParams(next, { replace: true });
    },
    [routing?.syncFiltersToUrl, setSearchParams],
  );

  return { initialRecordId, initialIsNew, initialFilters, syncFilters };
}
