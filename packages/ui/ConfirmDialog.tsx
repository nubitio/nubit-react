import { AppDialog } from './AppDialog';
import { useUiStrings } from './UiStrings';
import { Button } from './Button';
import './ConfirmDialog.scss';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  variant = 'warning',
}: ConfirmDialogProps) {
  const strings = useUiStrings();
  const resolvedConfirmLabel = confirmLabel ?? strings.confirm;
  const resolvedCancelLabel = cancelLabel ?? strings.cancel;

  return (
    <AppDialog
      open={open}
      title={title}
      onClose={onCancel}
      maxWidth={420}
      role="alertdialog"
      footer={(
        <>
          <Button
            variant="secondary"
            onClick={onCancel}
            autoFocus
          >
            {resolvedCancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {resolvedConfirmLabel}
          </Button>
        </>
      )}
    >
      <p className="nb-confirm-dialog__message">{message}</p>
    </AppDialog>
  );
}
