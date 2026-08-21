import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Field } from '../field/Field';
import { BETWEEN_VALUE_SEPARATOR, splitBetweenValue } from '../field/registry/shared';
import { computeDefaultOperators, getDefaultFilterOperator, joinBetweenValue } from './FilterRow';

export type SortRule = { selector: string; desc: boolean };

/** Delay before a typed filter value reaches the query, in milliseconds. */
export const FILTER_DEBOUNCE_MS = 300;

export interface GridQueryStateOptions {
  fields: Field[];
  initialSort?: SortRule[];
  initialPageSize?: number;
  /** Notified with the committed filter map, never with in-flight keystrokes. */
  onFilterChange?: (filters: Record<string, string>) => void;
}

export interface GridQueryState {
  /** Committed filters — what the request is built from. */
  filters: Record<string, string>;
  /** What the filter editors display, which runs ahead of `filters` while typing. */
  filterInputs: Record<string, string>;
  filterOperators: Record<string, string>;
  sort: SortRule[];
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  goToPreviousPage: () => void;
  goToNextPage: (totalPages: number) => void;
  /** Cycles a sortable field asc → desc → unsorted. */
  toggleSort: (field: Field) => void;
  /** Sorts by one field, keeping the current direction. Null clears sorting. */
  sortBy: (selector: string | null) => void;
  /** Flips the active sort rule; a no-op when nothing is sorted. */
  toggleSortDirection: () => void;
  /** Commits a whole filter map at once (dropdowns, clears, range editors). */
  applyFilterInputsImmediate: (nextInputs: Record<string, string>) => void;
  /** Commits one typed value after the debounce window. */
  applyFilterInputDebounced: (field: Field, nextValue: string) => void;
  /** Switches a field's operator, reshaping its value when between is involved. */
  applyFilterOperator: (field: Field, nextOperator: string) => void;
  clearFilter: (field: Field) => void;
  operatorFor: (field: Field) => string;
  /** Drops every filter, operator override and sort rule. */
  resetQuery: () => void;
  /** Replaces the whole filter map and its operators in one commit. */
  replaceFilters: (
    nextFilters: Record<string, string>,
    nextOperators: Record<string, string>,
  ) => void;
}

/**
 * The grid's query state: filters, operators, sort and pagination.
 *
 * These four are one state machine rather than four independent pieces,
 * because narrowing the result set has to send the reader back to the first
 * page — a filter applied while on page 7 would otherwise show an empty grid
 * over a non-empty result. Keeping that invariant in one place is the reason
 * this hook exists; it lives outside NativeDataGridView so it can be exercised
 * without mounting a table.
 */
export function useGridQueryState({
  fields,
  initialSort,
  initialPageSize,
  onFilterChange,
}: GridQueryStateOptions): GridQueryState {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterInputs, setFilterInputs] = useState<Record<string, string>>({});
  const [filterOperators, setFilterOperators] = useState<Record<string, string>>(() =>
    computeDefaultOperators(fields),
  );
  const [sort, setSort] = useState<SortRule[]>(initialSort ?? []);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSizeState] = useState(initialPageSize ?? 20);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onFilterChangeRef = useRef(onFilterChange);
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  // A debounce still in flight when the grid unmounts would set state on a
  // dead component; the pending timer is dropped instead.
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const commit = useCallback((nextInputs: Record<string, string>) => {
    setFilters(nextInputs);
    setPage(0);
    onFilterChangeRef.current?.(nextInputs);
  }, []);

  const applyFilterInputsImmediate = useCallback(
    (nextInputs: Record<string, string>) => {
      clearTimeout(debounceRef.current);
      setFilterInputs(nextInputs);
      commit(nextInputs);
    },
    [commit],
  );

  const applyFilterInputDebounced = useCallback(
    (field: Field, nextValue: string) => {
      setFilterInputs((current) => {
        const nextInputs = { ...current, [field.name]: nextValue };
        if (nextValue === '') delete nextInputs[field.name];

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => commit(nextInputs), FILTER_DEBOUNCE_MS);

        return nextInputs;
      });
    },
    [commit],
  );

  const applyFilterOperator = useCallback(
    (field: Field, nextOperator: string) => {
      setFilterOperators((current) => ({ ...current, [field.name]: nextOperator }));

      setFilterInputs((current) => {
        const currentValue = current[field.name];
        // An operator switch only rewrites the query when there is a value to
        // carry over; otherwise the next keystroke does it.
        if (!currentValue) return current;

        const nextInputs = { ...current };
        const isRange = currentValue.includes(BETWEEN_VALUE_SEPARATOR);
        if (nextOperator === 'between' && !isRange) {
          nextInputs[field.name] = joinBetweenValue(currentValue, '');
        }
        if (nextOperator !== 'between' && isRange) {
          nextInputs[field.name] = splitBetweenValue(currentValue).find(Boolean) ?? '';
        }

        clearTimeout(debounceRef.current);
        commit(nextInputs);

        return nextInputs;
      });
    },
    [commit],
  );

  const clearFilter = useCallback(
    (field: Field) => {
      setFilterInputs((current) => {
        const nextInputs = { ...current };
        delete nextInputs[field.name];

        clearTimeout(debounceRef.current);
        commit(nextInputs);

        return nextInputs;
      });
    },
    [commit],
  );

  const toggleSort = useCallback((field: Field) => {
    if (!field.sortable) return;
    setPage(0);
    setSort((current) => {
      const existing = current.find((rule) => rule.selector === field.name);
      if (!existing) return [{ selector: field.name, desc: false }];
      if (!existing.desc) return [{ selector: field.name, desc: true }];
      return [];
    });
  }, []);

  const sortBy = useCallback((selector: string | null) => {
    setPage(0);
    setSort((current) => (selector ? [{ selector, desc: current[0]?.desc ?? false }] : []));
  }, []);

  const toggleSortDirection = useCallback(() => {
    setPage(0);
    setSort((current) =>
      current[0] ? [{ selector: current[0].selector, desc: !current[0].desc }] : current,
    );
  }, []);

  // Resizing the page invalidates the current offset, so it restarts at the top.
  const setPageSize = useCallback((nextPageSize: number) => {
    setPageSizeState(nextPageSize);
    setPage(0);
  }, []);

  const goToPreviousPage = useCallback(() => setPage((current) => Math.max(0, current - 1)), []);

  const goToNextPage = useCallback(
    (totalPages: number) => setPage((current) => Math.min(totalPages - 1, current + 1)),
    [],
  );

  const operatorFor = useCallback(
    (field: Field) => filterOperators[field.name] ?? getDefaultFilterOperator(field),
    [filterOperators],
  );

  // Imperative entry points (GridHandle.reset / GridHandle.filter). They skip
  // onFilterChange: the caller drove the change and already knows.
  const resetQuery = useCallback(() => {
    clearTimeout(debounceRef.current);
    setFilters({});
    setFilterInputs({});
    setFilterOperators(computeDefaultOperators(fields));
    setSort([]);
    setPage(0);
  }, [fields]);

  const replaceFilters = useCallback(
    (nextFilters: Record<string, string>, nextOperators: Record<string, string>) => {
      clearTimeout(debounceRef.current);
      setFilters(nextFilters);
      setFilterInputs(nextFilters);
      setFilterOperators(nextOperators);
      setPage(0);
    },
    [],
  );

  return useMemo(
    () => ({
      filters,
      filterInputs,
      filterOperators,
      sort,
      page,
      pageSize,
      setPage,
      setPageSize,
      goToPreviousPage,
      goToNextPage,
      toggleSort,
      sortBy,
      toggleSortDirection,
      applyFilterInputsImmediate,
      applyFilterInputDebounced,
      applyFilterOperator,
      clearFilter,
      operatorFor,
      resetQuery,
      replaceFilters,
    }),
    [
      filters,
      filterInputs,
      filterOperators,
      sort,
      page,
      pageSize,
      setPageSize,
      goToPreviousPage,
      goToNextPage,
      toggleSort,
      sortBy,
      toggleSortDirection,
      applyFilterInputsImmediate,
      applyFilterInputDebounced,
      applyFilterOperator,
      clearFilter,
      operatorFor,
      resetQuery,
      replaceFilters,
    ],
  );
}
