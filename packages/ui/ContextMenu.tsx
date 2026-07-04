import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';
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

function getDropdownStyle(
  anchor: HTMLElement | null,
  align: 'right' | 'left',
): CSSProperties {
  if (!anchor) {
    return { position: 'fixed', visibility: 'hidden', margin: 0 };
  }

  const rect = anchor.getBoundingClientRect();
  const menuWidth = MENU_MIN_WIDTH;
  const left =
    align === 'right'
      ? Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8))
      : Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openAbove = spaceBelow < 200 && spaceAbove > spaceBelow;

  if (openAbove) {
    return {
      position: 'fixed',
      left: `${left}px`,
      width: `${menuWidth}px`,
      bottom: `${window.innerHeight - rect.top + 4}px`,
      top: 'auto',
      margin: 0,
      zIndex: 1600,
      visibility: 'visible',
    };
  }

  return {
    position: 'fixed',
    left: `${left}px`,
    width: `${menuWidth}px`,
    top: `${rect.bottom + 4}px`,
    bottom: 'auto',
    margin: 0,
    zIndex: 1600,
    visibility: 'visible',
  };
}

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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
    margin: 0,
  });

  const computeMenuStyle = useCallback(
    () => getDropdownStyle(containerRef.current, align),
    [align],
  );

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // happy-dom/jsdom often report 0×0 until layout runs — don't treat that as off-screen.
      const hasLayout = rect.width > 0 || rect.height > 0;
      if (
        hasLayout &&
        (rect.top >= window.innerHeight || rect.bottom <= 0)
      ) {
        setOpen(false);
        return;
      }
      setMenuStyle(computeMenuStyle());
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, { capture: true });
    };
  }, [open, computeMenuStyle]);

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
        <span onClick={() => setOpen((v) => !v)}>{trigger}</span>
      ) : (
        <IconButton
          icon="ph ph-dots-three"
          label={triggerLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => {
            if (!open) {
              setMenuStyle(computeMenuStyle());
            }
            setOpen((v) => !v);
          }}
        />
      )}

      {dropdown && createPortal(dropdown, document.body)}
    </div>
  );
};