import { useCallback, useMemo, useState } from 'react';
import type { CoreRuntime } from '@nubitio/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
  id: number;
  message: string;
  type: NotificationType;
};

export function useAppRuntime() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, type: NotificationType = 'info', durationMs = 4000) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, message, type }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const confirm = useCallback((message: string) => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.confirm(message);
  }, []);

  const runtime = useMemo<CoreRuntime>(() => ({ notify, confirm }), [confirm, notify]);

  return { runtime, toasts, dismiss };
}