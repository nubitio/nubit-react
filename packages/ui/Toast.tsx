import type { ReactNode } from 'react';
import { useUiStrings } from './UiStrings';
import './Toast.scss';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: ReactNode;
  tone?: ToastTone;
}

export interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  className?: string;
}

const TONE_CLASS: Record<ToastTone, string> = {
  info: 'nb-toast--info',
  success: 'nb-toast--success',
  warning: 'nb-toast--warning',
  error: 'nb-toast--error',
};

export function ToastViewport({ toasts, onDismiss, className }: ToastViewportProps) {
  const strings = useUiStrings();
  if (toasts.length === 0) return null;

  const hasError = toasts.some((toast) => toast.tone === 'error');

  return (
    <div
      className={['nb-toast-host', className].filter(Boolean).join(' ')}
      aria-live={hasError ? 'assertive' : 'polite'}
    >
      {toasts.map((toast) => {
        const tone = toast.tone ?? 'info';
        return (
          <div
            key={toast.id}
            className={`nb-toast ${TONE_CLASS[tone]}`}
            role={tone === 'error' ? 'alert' : 'status'}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              className="nb-toast__close"
              aria-label={strings.close}
              onClick={() => onDismiss(toast.id)}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
