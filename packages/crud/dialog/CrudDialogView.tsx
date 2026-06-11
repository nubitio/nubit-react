import './CrudDialogView.scss';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { AppDialog, Button } from '@nubit/ui';
import { useCoreTranslation, useEvents, type DialogEventNames } from '@nubit/core';

const getIsXSmall = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 575.98px)').matches;

function useIsXSmall() {
  const [isXSmall, setIsXSmall] = useState(getIsXSmall);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 575.98px)');
    const onChange = () => setIsXSmall(media.matches);
    media.addEventListener('change', onChange);
    onChange();

    return () => media.removeEventListener('change', onChange);
  }, []);

  return isXSmall;
}

export interface CrudDialogViewOptions {
  title?: string;
  width?: number;
  height?: number;
  maxHeight?: number;
  visible?: boolean;
  /**
   * @deprecated Prefer controlled open state plus onSave/onCancel callbacks.
   * Events remain as a legacy fallback for direct DialogView consumers.
   */
  events?: DialogEventNames;
  children?: React.ReactNode;
  positiveText?: string;
  negativeText?: string;
  footerVisible?: boolean;
  fitContent?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  /** When false, only the cancel/close button is shown in the footer. */
  saveVisible?: boolean;
}

export interface CrudDialogViewEvents {
  open: (title?: string) => void;
  close: () => void;
}

export const CrudDialogView = forwardRef<CrudDialogViewEvents, CrudDialogViewOptions>(
  (options, ref) => {
    const { t } = useCoreTranslation();
    const [title, setTitle] = useState<string>(options.title ?? t('crudPage.dialogTitleAdd'));
    const isControlled = options.isOpen !== undefined;
    const [internalVisible, setInternalVisible] = useState<boolean>(options.visible ?? false);
    const visible = isControlled ? (options.isOpen ?? false) : internalVisible;
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const isXSmall = useIsXSmall();
    const [on, emit] = useEvents();
    const width = options.width ?? 480;

    useEffect(() => {
      if (options.title) {
        setTitle(options.title);
      }
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
    // eslint-disable-next-line react-hooks/refs -- keep event subscriptions using latest options without resubscribing
    setupObserversRef.current = setupObservers;

    useEffect(() => {
      setupObserversRef.current();
    }, []);

    useImperativeHandle(ref, () => ({ open, close }));

    return (
      <AppDialog
        title={title}
        open={visible}
        fullScreen={isXSmall}
        width={width}
        height={options.height ?? 'auto'}
        maxWidth={options.width ?? undefined}
        onClose={handleClose}
        closeLabel={t('dialog.close')}
        closeOnEscape={!isProcessing}
        closeOnOutsideClick={false}
        keepMounted
        rootClassName="nb-crud-dialog-root"
        className={['nb-crud-dialog', options.fitContent ? 'fit-content' : 'form-popup'].join(' ')}
        headerClassName="nb-crud-dialog__header"
        titleClassName="nb-crud-dialog__title"
        bodyClassName="nb-crud-dialog__body"
        footerClassName="nb-crud-dialog__footer"
        footer={
          (options.footerVisible ?? true) ? (
            <div className={`form-popup-buttons-container ${width <= 360 ? 'flex-buttons' : ''}`}>
              <Button
                variant="secondary"
                onClick={onCancelClick}
                disabled={isProcessing}
              >
                {options.negativeText ?? t('dialog.buttonCancel')}
              </Button>
              {(options.saveVisible ?? true) && (
                <Button
                  variant="primary"
                  className="nb-dialog-save-button"
                  onClick={onSaveClick}
                  loading={isProcessing}
                >
                  <span>{options.positiveText ?? t('dialog.buttonSave')}</span>
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {options.children}
        {isProcessing && (
          <div className="nb-crud-dialog__loading" aria-hidden="true">
            <span className="nb-crud-dialog__loading-indicator" />
          </div>
        )}
      </AppDialog>
    );
  },
);

CrudDialogView.displayName = 'CrudDialogView';
