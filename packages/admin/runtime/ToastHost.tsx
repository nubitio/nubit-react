import { ToastViewport, type ToastTone } from '@nubitio/ui';
import type { NotificationType, ToastItem } from './useAppRuntime';

export interface ToastHostProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

const TONE: Record<NotificationType, ToastTone> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

/** App-level toast host. Visuals live in `@nubitio/ui` `ToastViewport`. */
export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  return (
    <ToastViewport
      toasts={toasts.map((toast) => ({
        id: String(toast.id),
        message: toast.message,
        tone: TONE[toast.type],
      }))}
      onDismiss={(id) => onDismiss(Number(id))}
    />
  );
}
