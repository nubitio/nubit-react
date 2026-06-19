import { useCallback, useEffect, useState } from 'react';

/** Free-form JSON from GET /api/runtime-config — each app defines the shape. */
export type RuntimeConfig = Record<string, unknown>;

export type RuntimeConfigState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; config: RuntimeConfig }
  | { status: 'error' };

export interface UseRuntimeConfigOptions {
  /** API base URL, e.g. `/api/`. */
  apiBaseUrl?: string;
  /** Endpoint relative to apiBaseUrl. @default `runtime-config` */
  path?: string;
  /** When false, skips the fetch (e.g. endpoint not enabled). @default true */
  enabled?: boolean;
}

function joinApiPath(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function useRuntimeConfig({
  apiBaseUrl = '/api/',
  path = 'runtime-config',
  enabled = true,
}: UseRuntimeConfigOptions = {}) {
  const [state, setState] = useState<RuntimeConfigState>({ status: 'idle' });

  const refresh = useCallback(async () => {
    if (!enabled) {
      setState({ status: 'idle' });
      return;
    }

    setState({ status: 'loading' });

    try {
      const response = await fetch(joinApiPath(apiBaseUrl, path), { credentials: 'include' });
      if (!response.ok) {
        setState({ status: 'error' });
        return;
      }

      const config = (await response.json()) as RuntimeConfig;
      setState({ status: 'ready', config });
    } catch {
      setState({ status: 'error' });
    }
  }, [apiBaseUrl, enabled, path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    state,
    config: state.status === 'ready' ? state.config : null,
    loading: state.status === 'loading',
    error: state.status === 'error',
    refresh,
  };
}