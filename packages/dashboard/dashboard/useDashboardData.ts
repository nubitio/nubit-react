import { useQuery } from '@tanstack/react-query';
import { useCoreHttpClient } from '@nubitio/core';
import { DEFAULT_PERIOD_PARAM_NAMES } from './defaults';
import type { DashboardDataResult, DashboardPeriodValue } from './types';

export function useDashboardData(
  dataUrl?: string,
  refreshInterval?: number,
  period?: DashboardPeriodValue,
  periodParamNames: { start: string; end: string } = DEFAULT_PERIOD_PARAM_NAMES,
): DashboardDataResult {
  const http = useCoreHttpClient();
  const params = period ? { [periodParamNames.start]: period.start, [periodParamNames.end]: period.end } : undefined;

  const query = useQuery({
    queryKey: ['nb-dashboard', dataUrl, params],
    queryFn: async () => {
      const response = await http.get<Record<string, unknown>>(dataUrl!, { params });
      return response.data;
    },
    enabled: !!dataUrl,
    refetchInterval: refreshInterval,
    retry: false,
  });

  return {
    data: query.data ?? {},
    loading: query.isLoading,
    error: query.error ? (query.error instanceof Error ? query.error.message : 'Failed to load dashboard') : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
