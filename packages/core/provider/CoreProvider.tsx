import React from 'react';
import { CoreHttpProvider, type CoreHttpClient, type CoreHttpClientConfig } from '../http';
import { CoreRuntimeProvider, type CoreRuntime } from '../runtime';

export interface CoreProviderProps {
  children: React.ReactNode;
  http?: CoreHttpClientConfig;
  httpClient?: CoreHttpClient;
  runtime?: Partial<CoreRuntime>;
}

export function CoreProvider({ children, http, httpClient, runtime }: CoreProviderProps) {
  return (
    <CoreHttpProvider client={httpClient} config={http}>
      <CoreRuntimeProvider runtime={runtime}>{children}</CoreRuntimeProvider>
    </CoreHttpProvider>
  );
}
