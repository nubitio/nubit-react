import React, { useId } from 'react';
import { ModalSurface } from './ModalSurface';
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
  /** Optional focus target when opening; defaults to the first focusable control. */
  initialFocus?: React.RefObject<HTMLElement | null>;
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
  initialFocus,
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
  return (
    <ModalSurface
      open={isVisible}
      onClose={onClose}
      rootClassName={joinClassNames('nb-dialog-root', rootClassName)}
      className={joinClassNames('nb-dialog', fullScreen && 'nb-dialog--fullscreen', className)}
      scrimClassName="nb-dialog__scrim"
      scrimLabel={resolvedScrimLabel}
      labelledBy={titleId}
      role={role}
      closeOnEscape={closeOnEscape}
      closeOnOutsideClick={closeOnOutsideClick}
      restoreFocus={restoreFocus}
      keepMounted={keepMounted}
      initialFocus={initialFocus}
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
    </ModalSurface>
  );
};
