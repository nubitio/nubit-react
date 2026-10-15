import { Dialog } from '@base-ui/react/dialog';
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type AriaRole,
} from 'react';
import { OverlayContainerContext, useOverlayContainer } from './OverlayContainer';

/** Shared modal behavior for centered dialogs and side sheets. */
export function ModalSurface({
  open,
  onClose,
  children,
  rootClassName,
  className,
  style,
  scrimClassName,
  scrimLabel,
  labelledBy,
  ariaLabel,
  role = 'dialog',
  keepMounted = false,
  restoreFocus = true,
  closeOnEscape = true,
  initialFocus,
  closeOnOutsideClick = true,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  rootClassName: string;
  className: string;
  style?: CSSProperties;
  scrimClassName: string;
  scrimLabel: string;
  labelledBy?: string;
  ariaLabel?: string;
  role?: string;
  keepMounted?: boolean;
  restoreFocus?: boolean;
  closeOnEscape?: boolean;
  initialFocus?: Dialog.Popup.Props['initialFocus'];
  closeOnOutsideClick?: boolean;
}) {
  const parentContainer = useOverlayContainer();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && !container?.contains(active)) returnFocus.current = active;
  }, [open, container]);
  return (
    <Dialog.Root
      open={open}
      disablePointerDismissal={!closeOnOutsideClick}
      onOpenChange={(next, details) => {
        if (!next) {
          if (details.reason === 'escape-key' && !closeOnEscape) details.cancel();
          else onClose();
        }
      }}
    >
      <Dialog.Portal
        container={parentContainer ?? undefined}
        keepMounted={keepMounted}
        className={rootClassName}
        aria-hidden={!open || undefined}
        style={{
          visibility: open ? undefined : 'hidden',
          pointerEvents: open ? undefined : 'none',
        }}
      >
        <Dialog.Backdrop
          forceRender
          className={scrimClassName}
          render={<button type="button" tabIndex={-1} aria-label={scrimLabel} />}
        />
        <Dialog.Popup
          ref={setContainer}
          role={role as AriaRole}
          aria-labelledby={labelledBy}
          aria-label={ariaLabel}
          className={className}
          style={style}
          finalFocus={restoreFocus ? () => returnFocus.current ?? true : false}
          initialFocus={initialFocus}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !event.defaultPrevented) {
              event.stopPropagation();
              if (closeOnEscape) onClose();
            }
          }}
        >
          <OverlayContainerContext.Provider value={container}>
            {children}
          </OverlayContainerContext.Provider>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
