import React, { isValidElement, useRef, type ReactNode } from 'react';
import { Menu } from '@base-ui/react/menu';
import { IconButton } from './Button';
import { useOverlayContainer } from './OverlayContainer';
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

export const ContextMenu = ({
  items,
  visible = true,
  trigger,
  triggerLabel = 'Opciones',
  align = 'right',
  className = '',
}: ContextMenuProps) => {
  const container = useOverlayContainer();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  if (!visible) return null;
  return (
    <Menu.Root
      modal={false}
      onOpenChange={(open, details) => {
        restoreFocus.current =
          !open && (details.reason === 'item-press' || details.reason === 'escape-key');
      }}
      onOpenChangeComplete={(open) => {
        if (!open && restoreFocus.current) triggerRef.current?.focus({ preventScroll: true });
      }}
    >
      <div className={`nb-context-menu${className ? ` ${className}` : ''}`}>
        <Menu.Trigger
          ref={triggerRef}
          render={
            isValidElement(trigger) ? (
              trigger
            ) : (
              <IconButton icon="ph ph-dots-three" label={triggerLabel}>
                {trigger}
              </IconButton>
            )
          }
        />
        <Menu.Portal container={container ?? undefined}>
          <Menu.Positioner
            align={align === 'right' ? 'end' : 'start'}
            sideOffset={4}
            className="nb-context-menu-positioner"
          >
            <Menu.Popup finalFocus={triggerRef} className="nb-context-menu__dropdown">
              {items.map((item, index) => (
                <React.Fragment key={index}>
                  {item.separator && <Menu.Separator className="nb-context-menu__separator" />}
                  <Menu.Item
                    disabled={item.disabled}
                    label={item.label}
                    className={`nb-context-menu__item${item.danger ? ' nb-context-menu__item--danger' : ''}`}
                    onClick={item.onClick}
                  >
                    {item.icon && <i className={item.icon} aria-hidden="true" />}
                    {item.label}
                  </Menu.Item>
                </React.Fragment>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </div>
    </Menu.Root>
  );
};
