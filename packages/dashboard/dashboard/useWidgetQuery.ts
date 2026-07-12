import { useQuery } from '@tanstack/react-query';
import { useCoreHttpClient } from '@nubitio/core';
import { DEFAULT_PERIOD_PARAM_NAMES } from './defaults';
import type { DashboardPeriodValue, WidgetQueryConfig } from './types';

export interface WidgetQueryResult {
  data: Record<string, unknown>;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches a single widget's data independently of the dashboard's shared
 * payload — its own cache entry, its own loading/error state, no head-of-line
 * blocking behind slower widgets. Returns `undefined` when the widget has no
 * `query` configured, so callers fall back to the dashboard's shared data.
 */
export function useWidgetQuery(
  query: WidgetQueryConfig | undefined,
  period: DashboardPeriodValue | undefined,
  periodParamNames: { start: string; end: string } = DEFAULT_PERIOD_PARAM_NAMES,
): WidgetQueryResult | undefined {
  const http = useCoreHttpClient();
  const usePeriod = query?.usePeriod ?? true;
  const periodParams =
    usePeriod && period ? { [periodParamNames.start]: period.start, [periodParamNames.end]: period.end } : undefined;
  const params = query ? { ...query.params, ...periodParams } : undefined;

  const result = useQuery({
    queryKey: ['nb-dashboard-widget', query?.url, params],
    queryFn: async () => {
      const response = await http.get<Record<string, unknown>>(query!.url, { params });
      return response.data;
    },
    enabled: !!query,
    refetchInterval: query?.refreshInterval,
    retry: false,
  });

  if (!query) return undefined;

  return {
    data: result.data ?? {},
    loading: result.isLoading,
    error: result.error ? (result.error instanceof Error ? result.error.message : 'Failed to load widget') : null,
  };
}
