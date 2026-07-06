import React, { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';
import { computeAnchoredStyle, useFloatingPanel } from './useFloatingPanel';
import './ContextMenu.scss';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  /** Renders item in error color */
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** If true, renders a separator ABOVE this item */
  separator?: boolean;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  /** Whether the trigger button is visible at all */
  visible?: boolean;
  /** Custom trigger element. Defaults to three-dot icon button. */
  trigger?: ReactNode;
  /** Accessible label for the default trigger button */
  triggerLabel?: string;
  /** Alignment of the dropdown relative to the trigger */
  align?: 'right' | 'left';
  className?: string;
}

const MENU_MIN_WIDTH = 190;

/**
 * Three-dot overflow context menu.
 * Replaces the legacy `shared/ui/library/card-menu/CardMenu` component.
 *
 * Features over CardMenu:
 * - `danger` variant items
 * - `separator` support
 * - `icon` per item
 * - Custom trigger slot
 * - Left/right alignment
 * - Click-outside + Escape to close
 * - Portalled dropdown (avoids clip inside scrollable tables)
 */
export const ContextMenu = ({
  items,
  visible = true,
  trigger,
  triggerLabel = 'Opciones',
  align = 'right',
  className = '',
}: ContextMenuProps) => {
  const {
    open,
    setOpen,
    toggle,
    containerRef,
    panelRef: menuRef,
    panelStyle: menuStyle,
  } = useFloatingPanel<HTMLDivElement, HTMLUListElement>({
    dismissEvent: 'mousedown',
    closeOnViewportExit: true,
    computeStyle: (container) =>
      computeAnchoredStyle(container, {
        align: align === 'right' ? 'end' : 'start',
        minWidth: MENU_MIN_WIDTH,
        flipThreshold: 200,
        zIndex: 1600,
      }),
  });

  if (!visible) return null;

  const dropdown = open ? (
    <ul
      ref={menuRef}
      className="nb-context-menu__dropdown nb-context-menu__dropdown--portaled"
      role="menu"
      style={menuStyle}
    >
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {item.separator && (
            <li role="none" aria-hidden="true">
              <div className="nb-context-menu__separator" />
            </li>
          )}
          <li role="none">
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              aria-disabled={item.disabled}
              className={`nb-context-menu__item${item.danger ? ' nb-context-menu__item--danger' : ''}`}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
            >
              {item.icon && <i className={item.icon} aria-hidden="true" />}
              {item.label}
            </button>
          </li>
        </React.Fragment>
      ))}
    </ul>
  ) : null;

  return (
    <div
      ref={containerRef}
      className={`nb-context-menu${className ? ` ${className}` : ''}`}
    >
      {trigger ? (
        <span onClick={toggle}>{trigger}</span>
      ) : (
        <IconButton
          icon="ph ph-dots-three"
          label={triggerLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
        />
      )}

      {dropdown && createPortal(dropdown, document.body)}
    </div>
  );
};