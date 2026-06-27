import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Field } from '../field/Field';
import type { FormDetailDiagnostics } from './formDetailDiagnostics';

export type FieldResolutionSource = 'hydra' | 'manual' | 'fieldContract' | 'unknown';

export interface ResourceDiagnostics {
  apiUrl: string;
  source: FieldResolutionSource;
  fields: Field[];
  supportedOperations: string[];
  permissionsSource?: 'explicit' | 'inferred' | 'default';
  formDetail?: FormDetailDiagnostics;
  activeProviders?: string[];
  updatedAt: number;
}

export interface DevToolsContextValue {
  enabled: boolean;
  resources: ResourceDiagnostics[];
  registerResource: (diagnostics: ResourceDiagnostics) => void;
  clearResources: () => void;
}

const DevToolsContext = createContext<DevToolsContextValue | null>(null);

export interface DevToolsProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function DevToolsProvider({ children, enabled = true }: DevToolsProviderProps) {
  const [resources, setResources] = useState<ResourceDiagnostics[]>([]);

  const registerResource = useCallback((diagnostics: ResourceDiagnostics) => {
    if (!enabled) return;
    setResources((prev) => {
      const next = prev.filter((r) => r.apiUrl !== diagnostics.apiUrl);
      next.push(diagnostics);
      return next.sort((a, b) => a.apiUrl.localeCompare(b.apiUrl));
    });
  }, [enabled]);

  const clearResources = useCallback(() => setResources([]), []);

  const value = useMemo(
    () => ({ enabled, resources, registerResource, clearResources }),
    [enabled, resources, registerResource, clearResources],
  );

  return <DevToolsContext.Provider value={value}>{children}</DevToolsContext.Provider>;
}

export function useDevTools(): DevToolsContextValue {
  const ctx = useContext(DevToolsContext);
  if (!ctx) {
    return {
      enabled: false,
      resources: [],
      registerResource: () => undefined,
      clearResources: () => undefined,
    };
  }
  return ctx;
}