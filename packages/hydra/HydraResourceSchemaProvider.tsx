import React, { useMemo } from 'react';
import { ResourceSchemaProvider, type ResourceSchemaResolver } from '@nubitio/crud';
import { useResourceSchema } from './useResourceSchema';

export interface HydraResourceSchemaProviderProps {
  children: React.ReactNode;
}

function useHydraResourceSchema({ apiUrl }: { apiUrl: string }) {
  return useResourceSchema(apiUrl);
}

export function HydraResourceSchemaProvider({ children }: HydraResourceSchemaProviderProps) {
  const resolver = useMemo<ResourceSchemaResolver>(
    () => ({
      useResourceSchema: useHydraResourceSchema,
    }),
    [],
  );

  return (
    <ResourceSchemaProvider resolver={resolver}>
      {children}
    </ResourceSchemaProvider>
  );
}
