import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// useFloatingPanel — shared logic for floating panels (popovers, dropdowns).
//
// Encapsulates the repeated pattern found in:
//   AdminHeader, UserPanel, FeatureGate, POSCheckoutPanel customer dropdown
//
// Features:
//   - click-outside to close (via pointerdown)
//   - Escape key to close
//   - Returns ref to attach to the panel wrapper element
//
// Usage:
//   const { open, setOpen, toggle, containerRef } = useFloatingPanel();
//
//   <div ref={containerRef}>
//     <button onClick={toggle}>Open</button>
//     {open && <div>Panel content</div>}
//   </div>
// ---------------------------------------------------------------------------

export interface UseFloatingPanelOptions {
  /** Called when the panel is closed by click-outside or Escape. */
  onClose?: () => void;
}

export interface UseFloatingPanelResult {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Attach this ref to the element that contains both trigger and panel. */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useFloatingPanel(
  options: UseFloatingPanelOptions = {},
): UseFloatingPanelResult {
  const [open, setOpenState] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(options.onClose);
  onCloseRef.current = options.onClose;

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) onCloseRef.current?.();
  }, []);

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, setOpen]);

  return { open, setOpen, toggle, containerRef };
}
