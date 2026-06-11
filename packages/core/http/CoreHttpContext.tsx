import React, { createContext, useContext, useMemo } from 'react';
import { CoreHttpClient, createCoreHttpClient, type CoreHttpClientConfig } from './CoreHttpClient';
import { getCoreApiBaseUrl } from '../config/CoreConfig';

const defaultHttpClient = createCoreHttpClient();
const CoreHttpContext = createContext<CoreHttpClient>(defaultHttpClient);

export interface CoreHttpProviderProps {
  children: React.ReactNode;
  client?: CoreHttpClient;
  config?: CoreHttpClientConfig;
}

export function CoreHttpProvider({ children, client, config }: CoreHttpProviderProps) {
  const value = useMemo(() => {
    if (client) return client;

    // If the caller didn't provide a baseUrl, fall back to the one configured
    // in CoreConfig (single source of truth for most applications).
    const finalConfig: CoreHttpClientConfig = {
      ...config,
      baseUrl: config?.baseUrl ?? getCoreApiBaseUrl(),
    };

    return createCoreHttpClient(finalConfig);
  }, [client, config]);

  return <CoreHttpContext.Provider value={value}>{children}</CoreHttpContext.Provider>;
}

export function useCoreHttpClient(): CoreHttpClient {
  return useContext(CoreHttpContext);
}
