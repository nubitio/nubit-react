import React, { useId } from 'react';
import { ModalSurface } from './ModalSurface';
import { IconButton } from './Button';
import { useUiStrings } from './UiStrings';
import './Drawer.scss';

export type DrawerSide = 'right' | 'left';

export interface DrawerProps {
  /** Controls visibility. The drawer mounts/unmounts with this flag. */
  isOpen: boolean;
  /** Called on Escape, scrim click, or the built-in close button. */
  onClose: () => void;
  /** Optional title rendered in the header. */
  title?: React.ReactNode;
  /** Width of the panel. Accepts any CSS value or a number (px). */
  width?: number | string;
  /** Which side the drawer slides in from. Default: right. */
  side?: DrawerSide;
  /**
   * Scrim opacity level.
   * - 'subtle'  — dimly tints background (default, keeps content legible)
   * - 'overlay' — solid overlay, same as modal backdrop
   */
  scrim?: 'subtle' | 'overlay';
  /** Content rendered inside the scrollable body. */
  children: React.ReactNode;
  /** Optional sticky footer (e.g. action buttons). */
  footer?: React.ReactNode;
  /** Accessible label for the close button. Defaults to UiStrings `close`. */
  closeLabel?: string;
  /** Accessible label for the backdrop scrim. Defaults to UiStrings `closePanel`. */
  scrimLabel?: string;
  /** Extra class applied to the panel element. */
  className?: string;
  /** aria-label for the dialog when no title is provided. */
  'aria-label'?: string;
}

const formatWidth = (value?: number | string) => {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  width,
  side = 'right',
  scrim = 'subtle',
  children,
  footer,
  closeLabel,
  scrimLabel,
  className,
  'aria-label': ariaLabel,
}) => {
  const strings = useUiStrings();
  const resolvedCloseLabel = closeLabel ?? strings.close;
  const resolvedScrimLabel = scrimLabel ?? strings.closePanel;
  const titleId = useId();
  return (
    <ModalSurface
      open={isOpen}
      onClose={onClose}
      rootClassName={['nb-drawer-root', isOpen && 'nb-drawer-root--open', `nb-drawer-root--${side}`]
        .filter(Boolean)
        .join(' ')}
      className={['nb-drawer', className].filter(Boolean).join(' ')}
      scrimClassName={`nb-drawer__scrim nb-drawer__scrim--${scrim}`}
      scrimLabel={resolvedScrimLabel}
      labelledBy={title ? titleId : undefined}
      ariaLabel={!title ? ariaLabel : undefined}
      style={{ width: formatWidth(width) }}
      keepMounted
    >
      {/* Header */}
      {title !== undefined && (
        <header className="nb-drawer__header">
          <h2 className="nb-drawer__title" id={titleId}>
            {title}
          </h2>
          <IconButton
            className="nb-drawer__close"
            icon="ph ph-x"
            label={resolvedCloseLabel}
            onClick={onClose}
          />
        </header>
      )}

      {/* Body */}
      <div className="nb-drawer__body">{children}</div>

      {/* Footer */}
      {footer && <footer className="nb-drawer__footer">{footer}</footer>}
    </ModalSurface>
  );
};
