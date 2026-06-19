import { useCallback, useEffect, useState } from 'react';
import { getCoreApiBaseUrl } from '@nubitio/core';
import type { DashboardDataResult } from './types';

function resolveDataUrl(dataUrl: string): string {
  if (/^https?:\/\//i.test(dataUrl)) return dataUrl;
  const base = getCoreApiBaseUrl().replace(/\/+$/, '');
  const path = dataUrl.startsWith('/') ? dataUrl : `/${dataUrl}`;
  return `${base}${path}`;
}

const EMPTY: DashboardDataResult = {
  data: {},
  loading: false,
  error: null,
};

export function useDashboardData(dataUrl?: string, refreshInterval?: number): DashboardDataResult {
  const [state, setState] = useState<DashboardDataResult>({ ...EMPTY, loading: !!dataUrl });

  const refetch = useCallback(async () => {
    if (!dataUrl) {
      setState(EMPTY);
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(resolveDataUrl(dataUrl), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Dashboard request failed (${response.status})`);
      }
      const data = (await response.json()) as Record<string, unknown>;
      setState({ data, loading: false, error: null, refetch });
    } catch (error) {
      setState({
        data: {},
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard',
        refetch,
      });
    }
  }, [dataUrl]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!refreshInterval || !dataUrl) return undefined;
    const timer = window.setInterval(() => {
      void refetch();
    }, refreshInterval);
    return () => window.clearInterval(timer);
  }, [dataUrl, refreshInterval, refetch]);

  return { ...state, refetch };
}