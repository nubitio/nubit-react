import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';
import { useUiStrings } from './UiStrings';

import './AppDialog.scss';

export interface AppDialogProps {
  visible?: boolean;
  open?: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
  maxWidth?: number | string;
  height?: number | string;
  fullScreen?: boolean;
  showCloseButton?: boolean;
  /** Accessible label for the close button. Defaults to UiStrings `close`. */
  closeLabel?: string;
  /** Accessible label for the backdrop scrim. Defaults to UiStrings `closeDialog`. */
  scrimLabel?: string;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  restoreFocus?: boolean;
  keepMounted?: boolean;
  rootClassName?: string;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  role?: string;
}

const formatSize = (value?: number | string) => {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
};

const joinClassNames = (...values: Array<string | undefined | false>) =>
  values.filter(Boolean).join(' ');

export const AppDialog = ({
  visible,
  open,
  title,
  onClose,
  children,
  footer,
  width,
  maxWidth,
  height,
  fullScreen = false,
  showCloseButton = true,
  closeLabel,
  scrimLabel,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  restoreFocus = true,
  keepMounted = false,
  rootClassName,
  className,
  headerClassName,
  titleClassName,
  bodyClassName,
  footerClassName,
  role = 'dialog',
}: AppDialogProps) => {
  const strings = useUiStrings();
  const resolvedCloseLabel = closeLabel ?? strings.close;
  const resolvedScrimLabel = scrimLabel ?? strings.closeDialog;
  const isVisible = visible ?? open ?? false;
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef(restoreFocus);

  useEffect(() => {
    restoreFocusRef.current = restoreFocus;
  }, [restoreFocus]);

  useEffect(() => {
    if (!isVisible) return;

    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    });

    return () => {
      if (restoreFocusRef.current) {
        lastFocusedElementRef.current?.focus?.();
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, onClose, isVisible]);

  if (!isVisible && !keepMounted) return null;

  return createPortal(
    <div
      className={joinClassNames('nb-dialog-root', rootClassName)}
      aria-hidden={!isVisible}
      style={{
        pointerEvents: isVisible ? undefined : 'none',
        visibility: isVisible ? undefined : 'hidden',
      }}
    >
      <button
        className="nb-dialog__scrim"
        type="button"
        aria-label={resolvedScrimLabel}
        onClick={closeOnOutsideClick ? onClose : undefined}
      />
      <div
        className={joinClassNames('nb-dialog', fullScreen && 'nb-dialog--fullscreen', className)}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        onKeyDownCapture={(event) => {
          if (!closeOnEscape && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        style={{
          width: formatSize(width),
          maxWidth: formatSize(maxWidth),
          height: formatSize(height),
        }}
      >
        <div className={joinClassNames('nb-dialog__header', headerClassName)}>
          <h2 className={joinClassNames('nb-dialog__title', titleClassName)} id={titleId}>
            {title}
          </h2>
          {showCloseButton && (
            <IconButton
              className="nb-dialog__close"
              icon="ph ph-x"
              label={resolvedCloseLabel}
              onClick={onClose}
            />
          )}
        </div>
        <div className={joinClassNames('nb-dialog__body', bodyClassName)}>{children}</div>
        {footer && (
          <div className={joinClassNames('nb-dialog__footer', footerClassName)}>{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
};
