import './toast.scss';
import type { NotificationType, ToastItem } from './useAppRuntime';

const TYPE_CLASS: Record<NotificationType, string> = {
  success: 'nb-toast--success',
  error: 'nb-toast--error',
  warning: 'nb-toast--warning',
  info: 'nb-toast--info',
};

export interface ToastHostProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="nb-toast-host" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`nb-toast ${TYPE_CLASS[toast.type]}`} role="status">
          <span>{toast.message}</span>
          <button type="button" className="nb-toast__close" onClick={() => onDismiss(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}