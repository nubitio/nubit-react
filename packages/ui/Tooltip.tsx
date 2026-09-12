import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useRef,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { HIDDEN_PANEL_STYLE, useFloatingPanel } from './useFloatingPanel';
import './Tooltip.scss';

export type TooltipPlacement = 'top' | 'bottom' | 'start' | 'end';

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  placement?: TooltipPlacement;
  delay?: number;
  className?: string;
}

function computeTooltipStyle(
  anchor: HTMLElement | null,
  placement: TooltipPlacement,
): CSSProperties {
  if (!anchor) return HIDDEN_PANEL_STYLE;

  const rect = anchor.getBoundingClientRect();
  const gutter = 8;
  const offset = 6;
  const zIndex = 10000;

  if (placement === 'start' || placement === 'end') {
    const top = Math.max(gutter, Math.min(rect.top, window.innerHeight - gutter));
    if (placement === 'end') {
      return {
        position: 'fixed',
        left: `${rect.right + offset}px`,
        top: `${top}px`,
        margin: 0,
        zIndex,
        visibility: 'visible',
      };
    }
    return {
      position: 'fixed',
      right: `${window.innerWidth - rect.left + offset}px`,
      left: 'auto',
      top: `${top}px`,
      margin: 0,
      zIndex,
      visibility: 'visible',
    };
  }

  const left = Math.max(gutter, Math.min(rect.left, window.innerWidth - gutter));
  if (placement === 'top') {
    return {
      position: 'fixed',
      left: `${left}px`,
      bottom: `${window.innerHeight - rect.top + offset}px`,
      top: 'auto',
      margin: 0,
      zIndex,
      visibility: 'visible',
    };
  }

  return {
    position: 'fixed',
    left: `${left}px`,
    top: `${rect.bottom + offset}px`,
    bottom: 'auto',
    margin: 0,
    zIndex,
    visibility: 'visible',
  };
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 200,
  className,
}: TooltipProps) {
  const id = useId();
  const timerRef = useRef<number | undefined>(undefined);
  const { open, setOpen, openPanel, containerRef, panelRef, panelStyle } = useFloatingPanel({
    computeStyle: (container) => computeTooltipStyle(container, placement),
  });

  const show = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => openPanel(), delay);
  };

  const hide = () => {
    window.clearTimeout(timerRef.current);
    setOpen(false);
  };

  if (!isValidElement(children)) {
    throw new Error('Tooltip children must be a single React element');
  }

  const child = children as ReactElement<{
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    onFocus?: (event: FocusEvent) => void;
    onBlur?: (event: FocusEvent) => void;
    'aria-describedby'?: string;
  }>;

  // Merge hover/focus handlers onto the trigger. cloneElement is the
  // documented API; we do not read ref.current during render.
  // eslint-disable-next-line react-hooks/refs -- handler merge, not ref access
  const trigger = cloneElement(child, {
    onMouseEnter: (event) => {
      child.props.onMouseEnter?.(event);
      show();
    },
    onMouseLeave: (event) => {
      child.props.onMouseLeave?.(event);
      hide();
    },
    onFocus: (event) => {
      child.props.onFocus?.(event);
      show();
    },
    onBlur: (event) => {
      child.props.onBlur?.(event);
      hide();
    },
    'aria-describedby': open ? id : child.props['aria-describedby'],
  });

  return (
    <span ref={containerRef} className={['nb-tooltip', className].filter(Boolean).join(' ')}>
      {Children.only(trigger)}
      {open ? (
        <span
          ref={panelRef}
          id={id}
          role="tooltip"
          className="nb-tooltip__panel"
          style={panelStyle}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
