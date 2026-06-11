import { useMemo } from 'react';
import type { DataRecord, Field, ResourceSchemaResolution } from '@nubitio/crud';
import { mapHydraSchemaToFields } from './HydraToFieldMapper';
import { parseHydraDoc, parseOpenApiDoc } from './openApiParser';
import { useSchemaContext } from './SchemaContext';

export type UseResourceSchemaResult = ResourceSchemaResolution;

/**
 * Normalizes an API URL by stripping any leading slash and query string so that
 * 'api/categories', '/api/categories', and '/api/categories?foo=bar' are treated as equal.
 */
function normalizeUrl(url: string): string {
  const base = url.split('?')[0];
  return base.startsWith('/') ? base.slice(1) : base;
}

export function useResourceSchema<T extends DataRecord = DataRecord>(
  apiUrl: string,
): UseResourceSchemaResult {
  void (undefined as T | undefined);
  const { data, isLoading, error } = useSchemaContext();

  // Memoised so the resulting `fields` array keeps a stable identity across
  // re-renders. Without this every render re-parses the API doc and produces
  // fresh Field objects, which cascades into grid data reloads and lookup
  // refetches downstream (everything that depends on field identity).
  return useMemo(() => {
    if (!data) {
      return { fields: [], isLoading, error, supportedOperations: [] };
    }

    const resourceMap =
      data.format === 'hydra' ? parseHydraDoc(data.doc) : parseOpenApiDoc(data.doc);
    const normalizedInput = normalizeUrl(apiUrl);

    const resourceSchema = Object.values(resourceMap).find(
      (r) => normalizeUrl(r.apiUrl) === normalizedInput,
    );
    if (!resourceSchema) {
      return {
        fields: [],
        isLoading: false,
        error: new Error(`No schema found for ${apiUrl} in API doc`),
        supportedOperations: [],
      };
    }

    const inferred = mapHydraSchemaToFields(
      resourceSchema,
      (className) => resourceMap[className]?.apiUrl,
      (className) => resourceMap[className],
    );

    return {
      fields: inferred,
      isLoading: false,
      error: undefined,
      supportedOperations: resourceSchema.supportedOperations ?? [],
    };
  }, [data, isLoading, error, apiUrl]);
}
