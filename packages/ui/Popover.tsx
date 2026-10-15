import React, { isValidElement, useRef, useState } from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { useOverlayContainer } from './OverlayContainer';
import './Popover.scss';

export type PopoverAlign = 'start' | 'end';

export interface PopoverProps {
  /**
   * Render prop for the trigger element.
   * The open state is passed so the trigger can reflect aria-expanded.
   */
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  /**
   * Render prop for the panel content.
   * `close` is a callback to close the popover.
   */
  panel: (props: { close: () => void }) => React.ReactNode;
  /**
   * Horizontal alignment of the panel relative to the container.
   * - 'end' (default): right-aligns the panel (panel right = container right)
   * - 'start': left-aligns the panel (panel left = container left)
   */
  align?: PopoverAlign;
  /** Accessible label for the panel dialog wrapper. */
  ariaLabel?: string;
  className?: string;
}

export const Popover = ({ trigger, panel, align = 'end', ariaLabel, className }: PopoverProps) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [restoreFocus, setRestoreFocus] = useState(true);
  const changeOpen = (next: boolean) => {
    setRestoreFocus(true);
    setOpen(next);
  };
  const container = useOverlayContainer();
  // Both the legacy callback and Base UI resolve the same next state.
  const triggerNode = trigger({ open, toggle: () => changeOpen(!open) });
  return (
    <BasePopover.Root
      open={open}
      onOpenChange={(next, details) => {
        setRestoreFocus(details.reason !== 'outside-press' && details.reason !== 'focus-out');
        setOpen(next);
      }}
      onOpenChangeComplete={(next) => {
        if (!next && restoreFocus) triggerRef.current?.focus({ preventScroll: true });
      }}
    >
      <div
        className={['nb-popover', `nb-popover--${align}`, open && 'nb-popover--open', className]
          .filter(Boolean)
          .join(' ')}
      >
        <BasePopover.Trigger
          ref={triggerRef}
          render={
            isValidElement(triggerNode) ? triggerNode : <button type="button">{triggerNode}</button>
          }
        />
        <BasePopover.Portal container={container ?? undefined}>
          <BasePopover.Positioner align={align} sideOffset={8} className="nb-popover-positioner">
            <BasePopover.Popup
              finalFocus={triggerRef}
              onKeyDownCapture={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  changeOpen(false);
                }
              }}
              className="nb-popover__panel"
              aria-label={ariaLabel}
            >
              {panel({ close: () => changeOpen(false) })}
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </div>
    </BasePopover.Root>
  );
};
