import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useCoreTranslation, useEvents, type DialogEventNames } from '@nubitio/core';
import { CrudDrawerShell } from './CrudDrawerShell';
import { resolveDrawerWidth, type CrudDrawerSize } from './drawerSizes';

export interface CrudDrawerViewOptions {
  title?: string;
  /** Token width: sm 480, md 640, lg 880, xl 1120. Ignored when `drawerWidth` is set. */
  drawerSize?: CrudDrawerSize;
  drawerWidth?: number | string;
  drawerSide?: 'right' | 'left';
  visible?: boolean;
  /**
   * @deprecated Prefer controlled open state plus onSave/onCancel callbacks.
   * Events remain as a legacy fallback for direct DrawerView consumers.
   */
  events?: DialogEventNames;
  children?: React.ReactNode;
  positiveText?: string;
  negativeText?: string;
  footerVisible?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
}

export interface CrudDrawerViewEvents {
  open: (title?: string) => void;
  close: () => void;
}

/**
 * Event-driven drawer shell for legacy pages (SalePage, PriceListPage, etc.).
 * Mirrors `DialogView` API but slides in from the side so the grid stays visible.
 */
export const CrudDrawerView = forwardRef<CrudDrawerViewEvents, CrudDrawerViewOptions>(
  (options, ref) => {
    const { t } = useCoreTranslation();
    const [title, setTitle] = useState<string>(options.title ?? t('crudPage.dialogTitleAdd'));
    const isControlled = options.isOpen !== undefined;
    const [internalVisible, setInternalVisible] = useState<boolean>(options.visible ?? false);
    const visible = isControlled ? (options.isOpen ?? false) : internalVisible;
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [on, emit] = useEvents();

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

    setupObserversRef.current = setupObservers;

    useEffect(() => {
      setupObserversRef.current();
    }, []);

    useImperativeHandle(ref, () => ({ open, close }));

    return (
      <CrudDrawerShell
        isOpen={visible}
        mode="add"
        title={title}
        drawerWidth={resolveDrawerWidth({
          drawerSize: options.drawerSize,
          drawerWidth: options.drawerWidth,
        })}
        drawerSide={options.drawerSide ?? 'right'}
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
      </CrudDrawerShell>
    );
  },
);

CrudDrawerView.displayName = 'CrudDrawerView';