import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import type { ResourceLoadOptions, ResourceStore } from '../data/ResourceStore';
import { buildFilterExpression } from './FilterRow';

interface GridDataLoaderOptions {
  source: ResourceStore;
  fields: Field[];
  filters: Record<string, string>;
  filterOperators: Record<string, string>;
  sort: Array<{ selector: string; desc: boolean }>;
  page: number;
  pageSize: number;
  paging: boolean;
  manualLoad: boolean;
  data?: DataRecord[];
  suppliedGridSummary?: Record<string, unknown> | null;
  onContentReady: () => void;
}

/**
 * Owns the remote-data state machine for the native grid. Rendering adapters
 * consume this state; stale-response handling and load transitions stay here.
 */
export function useGridDataLoader({
  source,
  fields,
  filters,
  filterOperators,
  sort,
  page,
  pageSize,
  paging,
  manualLoad,
  data,
  suppliedGridSummary,
  onContentReady,
}: GridDataLoaderOptions) {
  const [rows, setRows] = useState<DataRecord[]>([]);
  const rowsRef = useRef<DataRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [gridSummary, setGridSummary] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(!manualLoad);
  const [loadError, setLoadError] = useState<{ status?: number } | null>(null);
  const loadSequence = useRef(0);

  const loadRows = useCallback(async () => {
    if (data) {
      rowsRef.current = data;
      setRows(data);
      setTotalCount(data.length);
      setGridSummary(suppliedGridSummary ?? null);
      setIsLoading(false);
      onContentReady();
      return data;
    }
    if (manualLoad) return rowsRef.current;

    setIsLoading(true);
    const sequence = ++loadSequence.current;
    const loadOptions: ResourceLoadOptions = {
      filter: buildFilterExpression(filters, filterOperators, fields),
      sort,
    };
    if (paging) {
      loadOptions.skip = page * pageSize;
      loadOptions.take = pageSize;
    }

    try {
      const result = await source.load(loadOptions);
      if (sequence !== loadSequence.current) return rowsRef.current;
      rowsRef.current = result.data;
      setRows(result.data);
      setTotalCount(result.totalCount);
      setGridSummary(result.gridSummary ?? null);
      setLoadError(null);
      setIsLoading(false);
      onContentReady();
      return result.data;
    } catch (error) {
      if (sequence !== loadSequence.current) return rowsRef.current;
      rowsRef.current = [];
      setRows([]);
      setTotalCount(0);
      setGridSummary(null);
      setLoadError({ status: (error as { status?: number } | null)?.status });
      setIsLoading(false);
      return [];
    }
  }, [
    data,
    fields,
    filterOperators,
    filters,
    manualLoad,
    onContentReady,
    page,
    pageSize,
    paging,
    sort,
    source,
    suppliedGridSummary,
  ]);

  useEffect(() => {
    // Data fetching is the external synchronization this effect owns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRows();
  }, [loadRows]);

  return {
    rows,
    rowsRef,
    totalCount,
    gridSummary,
    isLoading,
    setIsLoading,
    loadError,
    loadRows,
  };
}
