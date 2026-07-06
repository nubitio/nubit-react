import { useMemo } from 'react';
import type { DataRecord, ResourceSchemaResolution } from '@nubitio/crud';
import { getSchemaResolver } from './HydraSchemaResolver';
import { useSchemaContext } from './SchemaContext';

export type UseResourceSchemaResult = ResourceSchemaResolution;

export function useResourceSchema<T extends DataRecord = DataRecord>(
  apiUrl: string,
  options?: { enabled?: boolean },
): UseResourceSchemaResult {
  const enabled = options?.enabled !== false;
  void (undefined as T | undefined);
  const { data, isLoading, error } = useSchemaContext();

  // Memoised so the resulting `fields` array keeps a stable identity across
  // re-renders. Without this every render produces fresh Field objects, which
  // cascades into grid data reloads and lookup refetches downstream
  // (everything that depends on field identity).
  return useMemo(() => {
    if (!enabled) {
      return { fields: [], isLoading: false, error: undefined, supportedOperations: [] };
    }

    if (!data) {
      return { fields: [], isLoading, error, supportedOperations: [] };
    }

    const resolved = getSchemaResolver(data).resolveResource(apiUrl);
    return { ...resolved, error: resolved.error, isLoading: false };
  }, [data, enabled, isLoading, error, apiUrl]);
}
