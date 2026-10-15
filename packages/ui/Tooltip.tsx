import { useOverlayContainer } from './OverlayContainer';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { cloneElement, useId, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import './Tooltip.scss';

export interface TooltipProps {
  /** A native focusable element or a component that forwards its DOM ref and props. */
  children: ReactElement;
  /** Non-interactive supplementary text. Essential information should remain visible. */
  content: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export const TooltipProvider = BaseTooltip.Provider;
export type TooltipProviderProps = BaseTooltip.Provider.Props;

/** Uses the existing child as the trigger without adding a nested button. */
export function Tooltip({
  children,
  content,
  side = 'top',
  delay,
  disabled,
  className,
}: TooltipProps) {
  const overlayContainer = useOverlayContainer();
  const id = useId();
  const [open, setOpen] = useState(false);
  const existingDescription = (children.props as { 'aria-describedby'?: string })[
    'aria-describedby'
  ];
  const description =
    [existingDescription, open && !disabled ? id : undefined].filter(Boolean).join(' ') ||
    undefined;
  return (
    <BaseTooltip.Root open={open} disabled={disabled} onOpenChange={setOpen}>
      <BaseTooltip.Trigger
        render={cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
          'aria-describedby': description,
        })}
        onKeyDownCapture={(event) => {
          if (open && event.key === 'Escape') {
            event.stopPropagation();
            setOpen(false);
          }
        }}
        delay={delay}
      />
      <BaseTooltip.Portal container={overlayContainer ?? undefined}>
        <BaseTooltip.Positioner side={side} sideOffset={8} className="nb-tooltip-positioner">
          <BaseTooltip.Popup
            id={id}
            role="tooltip"
            className={`nb-tooltip${className ? ` ${className}` : ''}`}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
