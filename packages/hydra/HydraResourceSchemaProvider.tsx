import React, { useMemo } from 'react';
import { ResourceSchemaProvider, type ResourceSchemaResolver } from '@nubitio/crud';
import { useResourceSchema } from './useResourceSchema';

export interface HydraResourceSchemaProviderProps {
  children: React.ReactNode;
}

function useHydraResourceSchema({ apiUrl, enabled }: { apiUrl: string; enabled?: boolean }) {
  return useResourceSchema(apiUrl, { enabled });
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
