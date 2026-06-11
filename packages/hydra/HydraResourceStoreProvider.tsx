import React from 'react';
import { ResourceStoreProvider } from '@nubit/crud';
import { createHydraResourceStore } from './HydraRemoteDataSource';

export interface HydraResourceStoreProviderProps {
  children: React.ReactNode;
}

export function HydraResourceStoreProvider({ children }: HydraResourceStoreProviderProps) {
  return (
    <ResourceStoreProvider factory={createHydraResourceStore}>
      {children}
    </ResourceStoreProvider>
  );
}
