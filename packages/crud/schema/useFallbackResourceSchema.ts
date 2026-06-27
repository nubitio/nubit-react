import { useMemo } from 'react';
import type { ResourceSchemaRequest, ResourceSchemaResolution } from './ResourceSchema';

export function useFallbackResourceSchema(request: ResourceSchemaRequest): ResourceSchemaResolution {
  return useMemo(
    () => ({
      fields: [],
      isLoading: false,
      error: new Error(
        `No ResourceSchema resolver configured for ${request.apiUrl}. Wrap your app with ResourceSchemaProvider or a backend-specific provider such as HydraResourceSchemaProvider.`,
      ),
      supportedOperations: [],
    }),
    [request.apiUrl],
  );
}