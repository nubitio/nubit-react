import React, { createContext, useContext } from 'react';
import type { CoreHttpClient, DataRecord, GridData } from '@nubitio/core';

export type ResourceFilterDescriptor = unknown[];
export type ResourceSortDescriptor = { selector?: string; desc?: boolean } | string;

export interface ResourceFilterRule {
  field: string;
  operator: string;
  value: string | number | boolean;
}

export type ResourceLoadOption = Record<string, unknown>;

export type ResourceLoadOptions = DataRecord & {
  filter?: ResourceFilterDescriptor;
  sort?: ResourceSortDescriptor[];
  appendData?: DataRecord[];
  prependData?: DataRecord[];
  searchExpr?: unknown;
  searchValue?: unknown;
  searchOperation?: unknown;
};

export type ResourceLoadResult<TRecord extends DataRecord = DataRecord> = GridData<TRecord>;

export interface ResourceStoreOptions {
  url: string;
  idField: string;
  byKeyUrl?: string | null;
  defaultFilterRules?: ResourceFilterDescriptor[];
  defaultSortRules?: ResourceSortDescriptor[];
  options?: ResourceLoadOption[];
  iriMode?: boolean;
  httpClient?: CoreHttpClient;
}

export interface ResourceStore<TRecord extends DataRecord = DataRecord> {
  load(options: ResourceLoadOptions): Promise<ResourceLoadResult<TRecord>>;
  byKey?(key: unknown): Promise<TRecord | null>;
}

export type ResourceStoreFactory = (options: ResourceStoreOptions) => ResourceStore;

const ResourceStoreFactoryContext = createContext<ResourceStoreFactory | null>(null);

export interface ResourceStoreProviderProps {
  children: React.ReactNode;
  factory: ResourceStoreFactory;
}

export function ResourceStoreProvider({ children, factory }: ResourceStoreProviderProps) {
  return (
    <ResourceStoreFactoryContext.Provider value={factory}>
      {children}
    </ResourceStoreFactoryContext.Provider>
  );
}

export function useResourceStoreFactory(): ResourceStoreFactory {
  const factory = useContext(ResourceStoreFactoryContext);
  if (!factory) {
    throw new Error(
      'No ResourceStore factory configured. Wrap your app with ResourceStoreProvider or a backend-specific provider such as HydraResourceStoreProvider.',
    );
  }
  return factory;
}
