import React, { useRef, useState, useEffect, ReactNode } from 'react';
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

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  if (!visible) return null;

  const dropdownStyle: React.CSSProperties =
    align === 'left' ? { right: 'auto', left: 0 } : {};

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
          onClick={() => setOpen((v) => !v)}
        />
      )}

      {open && (
        <ul
          className="nb-context-menu__dropdown"
          role="menu"
          style={dropdownStyle}
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
      )}
    </div>
  );
};
