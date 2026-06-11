import React, { createContext, useContext, useMemo } from 'react';

export type CoreNotificationType = 'success' | 'error' | 'warning' | 'info';

export interface CoreRuntime {
  notify: (message: string, type?: CoreNotificationType, durationMs?: number) => void;
  confirm: (message: string) => boolean;
}

const defaultRuntime: CoreRuntime = {
  notify: () => undefined,
  confirm: (message) => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.confirm(message);
  },
};

const CoreRuntimeContext = createContext<CoreRuntime>(defaultRuntime);

export interface CoreRuntimeProviderProps {
  children: React.ReactNode;
  runtime?: Partial<CoreRuntime>;
}

export function CoreRuntimeProvider({ children, runtime }: CoreRuntimeProviderProps) {
  const value = useMemo<CoreRuntime>(
    () => ({
      ...defaultRuntime,
      ...runtime,
    }),
    [runtime],
  );

  return <CoreRuntimeContext.Provider value={value}>{children}</CoreRuntimeContext.Provider>;
}

export function useCoreRuntime(): CoreRuntime {
  return useContext(CoreRuntimeContext);
}
