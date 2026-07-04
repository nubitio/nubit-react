import { useCallback, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { useUiStrings } from './UiStrings';

export type ConfirmRequest = {
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmLabel?: string;
  onConfirm: () => void;
};

export function useConfirm() {
  const strings = useUiStrings();
  const [pending, setPending] = useState<ConfirmRequest | null>(null);

  const ask = useCallback((request: ConfirmRequest) => {
    setPending(request);
  }, []);

  const dismiss = useCallback(() => setPending(null), []);

  const ConfirmHost = () => (
    <ConfirmDialog
      open={pending !== null}
      title={pending?.title ?? ''}
      message={pending?.message ?? ''}
      variant={pending?.variant}
      confirmLabel={pending?.confirmLabel ?? strings.confirm}
      cancelLabel={strings.cancel}
      onCancel={dismiss}
      onConfirm={() => {
        pending?.onConfirm();
        dismiss();
      }}
    />
  );

  return { ask, dismiss, ConfirmHost };
}