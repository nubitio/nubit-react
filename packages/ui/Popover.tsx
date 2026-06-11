import React from 'react';
import './Popover.scss';
import { useFloatingPanel } from './useFloatingPanel';

// ---------------------------------------------------------------------------
// Popover — floating panel anchored to a trigger element.
//
// Composes `useFloatingPanel` with DOM structure and SCSS positioning.
// The panel is positioned absolutely below-right of the trigger by default;
// use `align` to flip to below-left.
//
// Usage:
//   <Popover
//     trigger={({ open }) => (
//       <IconButton icon="ph ph-bell" label="Notificaciones" aria-expanded={open} />
//     )}
//     panel={({ close }) => <NotificationPanel onHiding={close} ... />}
//     ariaLabel="Notificaciones"
//   />
// ---------------------------------------------------------------------------

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

export const Popover = ({
  trigger,
  panel,
  align = 'end',
  ariaLabel,
  className,
}: PopoverProps) => {
  const { open, setOpen, toggle, containerRef } = useFloatingPanel();

  return (
    <div
      ref={containerRef}
      className={[
        'nb-popover',
        `nb-popover--${align}`,
        open && 'nb-popover--open',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {trigger({ open, toggle })}

      {open && (
        <div
          className="nb-popover__panel"
          role="dialog"
          aria-label={ariaLabel}
        >
          {panel({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
};
