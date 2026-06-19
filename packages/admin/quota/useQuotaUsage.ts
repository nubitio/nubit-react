import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCoreHttpClient } from '@nubitio/core';
import { useFeatureConfig } from '../hooks/useFeature';

function readCollectionTotal(body: unknown): number {
  if (Array.isArray(body)) {
    return body.length;
  }

  if (typeof body !== 'object' || body === null) {
    return 0;
  }

  const record = body as Record<string, unknown>;
  const member = record['hydra:member'] ?? record['member'];
  const listed = Array.isArray(member) ? member.length : 0;

  return Number(record['hydra:totalItems'] ?? record['totalItems'] ?? listed);
}

export interface UseQuotaUsageOptions {
  featureKey: string;
  collectionPath: string;
  staleTimeMs?: number;
}

export function useQuotaUsage({
  featureKey,
  collectionPath,
  staleTimeMs = 10_000,
}: UseQuotaUsageOptions) {
  const http = useCoreHttpClient();
  const config = useFeatureConfig(featureKey);
  const max = Number(config.max ?? 0);

  const query = useQuery({
    queryKey: ['quota-usage', featureKey, collectionPath],
    queryFn: async () => {
      const response = await http.get(`${collectionPath}?itemsPerPage=100`, {
        headers: { Accept: 'application/ld+json' },
      });
      return readCollectionTotal(response.data);
    },
    staleTime: staleTimeMs,
  });

  const count = query.data ?? 0;
  const atLimit = max > 0 && count >= max;
  const nearLimit = max > 0 && count === max - 1;

  const refetch = useCallback(() => query.refetch(), [query]);

  return {
    count,
    max,
    atLimit,
    nearLimit,
    loading: query.isLoading,
    refetch,
  };
}