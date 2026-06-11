import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useCoreTranslation, useEvents, type DialogEventNames } from '@nubitio/core';
import { CrudPageShell } from './CrudPageShell';

export interface CrudPageViewOptions {
  title?: string;
  visible?: boolean;
  /**
   * Event-driven page shell for legacy pages that compose DataGridView + FormView directly.
   */
  events?: DialogEventNames;
  children?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
}

export interface CrudPageViewEvents {
  open: (title?: string) => void;
  close: () => void;
}

export const CrudPageView = forwardRef<CrudPageViewEvents, CrudPageViewOptions>(
  (options, ref) => {
    const { t } = useCoreTranslation();
    const [title, setTitle] = useState<string>(options.title ?? t('crudPage.dialogTitleAdd'));
    const isControlled = options.isOpen !== undefined;
    const [internalVisible, setInternalVisible] = useState<boolean>(options.visible ?? false);
    const visible = isControlled ? (options.isOpen ?? false) : internalVisible;
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [on, emit] = useEvents();

    useEffect(() => {
      if (options.title) setTitle(options.title);
    }, [options.title]);

    const open = (nextTitle?: string) => {
      if (!isControlled) setInternalVisible(true);
      if (nextTitle) setTitle(nextTitle);
    };

    const close = () => {
      if (isProcessing) return;
      if (!isControlled) setInternalVisible(false);
    };

    const handleClose = () => {
      if (isProcessing) return;
      close();
      options.onClose?.();
    };

    const onCancelClick = () => {
      handleClose();
      if (options.onCancel) {
        options.onCancel();
        return;
      }
      if (options.events?.CANCEL) emit(options.events.CANCEL);
    };

    const onSaveClick = () => {
      if (options.onSave) {
        options.onSave();
        return;
      }
      if (options.events?.SAVE) emit(options.events.SAVE);
    };

    const setupObservers = () => {
      if (options.events?.ADD) {
        on<{ title?: string } | undefined>(options.events.ADD, (payload) =>
          open(payload?.title ?? t('crudPage.dialogTitleAdd')),
        );
      }
      if (options.events?.EDIT) on(options.events.EDIT, () => open(t('crudPage.dialogTitleEdit')));
      if (options.events?.LOADING) {
        on<boolean>(options.events.LOADING, (isLoading) => setIsProcessing(isLoading));
      }
      if (options.events?.SUCCESS) on(options.events.SUCCESS, () => close());
    };

    const setupObserversRef = useRef(setupObservers);
    setupObserversRef.current = setupObservers; // eslint-disable-line react-hooks/refs

    useEffect(() => {
      setupObserversRef.current();
    }, []);

    useImperativeHandle(ref, () => ({ open, close }));

    return (
      <CrudPageShell
        isOpen={visible}
        mode="edit"
        title={title}
        onClose={handleClose}
        onCancel={onCancelClick}
        onSave={onSaveClick}
      >
        {options.children}
        {isProcessing && (
          <div className="nb-crud-dialog__loading" aria-hidden="true">
            <span className="nb-crud-dialog__loading-indicator" />
          </div>
        )}
      </CrudPageShell>
    );
  },
);

CrudPageView.displayName = 'CrudPageView';
