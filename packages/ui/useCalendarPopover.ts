import { useCallback, useEffect, useRef, useState } from 'react';
import { useOverlayContainer } from './OverlayContainer';

/** Bridge focus restoration between React Aria's popup and a parent Base UI modal. */
export function useCalendarPopover() {
  const container = useOverlayContainer();
  const groupRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const outsideTarget = useRef<HTMLElement | null>(null);
  const [open, updateOpen] = useState(false);
  useEffect(() => {
    if (!open || !container) return;
    const rememberTarget = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        container.contains(event.target) &&
        !panelRef.current?.contains(event.target)
      ) {
        outsideTarget.current = event.target.closest<HTMLElement>(
          'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
        );
      }
    };
    document.addEventListener('pointerdown', rememberTarget, true);
    return () => document.removeEventListener('pointerdown', rememberTarget, true);
  }, [open, container]);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const setOpen = useCallback(
    (next: boolean) => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (next) outsideTarget.current = null;
      const active = document.activeElement;
      const target = outsideTarget.current ?? groupRef.current?.querySelector('input');
      const restore =
        !next && container && (outsideTarget.current || panelRef.current?.contains(active));
      updateOpen(next);
      if (restore) {
        // Both focus scopes finish their unmount work in the first frame.
        frame.current = requestAnimationFrame(() => {
          frame.current = requestAnimationFrame(() => {
            frame.current = null;
            // Outside clicks and a subsequent Tab must retain their new focus target.
            if (
              document.activeElement === active ||
              document.activeElement === container ||
              document.activeElement === document.body
            )
              target?.focus();
          });
        });
      }
    },
    [container],
  );
  return { container, groupRef, panelRef, open, setOpen };
}
