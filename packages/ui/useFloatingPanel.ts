import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

// ---------------------------------------------------------------------------
// useFloatingPanel — the one home for floating-panel behaviour (popovers,
// dropdowns, context menus, date pickers).
//
// Owns:
//   - open state (setOpen / toggle / openPanel)
//   - dismiss: click-outside (container OR portalled panel) + Escape
//   - anchored mode: a fixed-position style recomputed on scroll/resize,
//     with optional close-when-the-anchor-leaves-the-viewport
//
// Simple usage (in-flow panel, CSS positioning):
//   const { open, toggle, containerRef } = useFloatingPanel();
//
// Anchored usage (portalled panel positioned from the trigger rect):
//   const { open, openPanel, containerRef, panelRef, panelStyle } =
//     useFloatingPanel({ computeStyle: (c) => computeAnchoredStyle(c, {...}) });
// ---------------------------------------------------------------------------

/** Style applied to an anchored panel before its first position is computed. */
export const HIDDEN_PANEL_STYLE: CSSProperties = {
  position: 'fixed',
  visibility: 'hidden',
  margin: 0,
};

export interface AnchoredStyleOptions {
  /** 'start' aligns panel left with the anchor's left edge; 'end' right-aligns. */
  align?: 'start' | 'end';
  /** Lower bound for the panel width. */
  minWidth?: number;
  /** Use the anchor's width as the panel width (still bounded by minWidth). */
  matchAnchorWidth?: boolean;
  /** Gap between anchor and panel in px. */
  offset?: number;
  /** Flip above the anchor when the space below drops under this. */
  flipThreshold?: number;
  zIndex?: number;
}

/**
 * Fixed-position style for a panel anchored to an element, clamped to the
 * viewport with an 8px gutter and flipped above the anchor when it fits
 * better there.
 */
export function computeAnchoredStyle(
  anchor: HTMLElement | null,
  options: AnchoredStyleOptions = {},
): CSSProperties {
  if (!anchor) return HIDDEN_PANEL_STYLE;

  const {
    align = 'start',
    minWidth = 0,
    matchAnchorWidth = false,
    offset = 4,
    flipThreshold = 250,
    zIndex = 9999,
  } = options;

  const rect = anchor.getBoundingClientRect();
  const width = Math.max(matchAnchorWidth ? rect.width : 0, minWidth);
  const left =
    align === 'end'
      ? Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
      : Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));

  const spaceBelow = window.innerHeight - rect.bottom;
  const openAbove = spaceBelow < flipThreshold && rect.top > spaceBelow;

  if (openAbove) {
    return {
      position: 'fixed',
      left: `${left}px`,
      width: `${width}px`,
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
    width: `${width}px`,
    top: `${rect.bottom + offset}px`,
    bottom: 'auto',
    margin: 0,
    zIndex,
    visibility: 'visible',
  };
}

export interface UseFloatingPanelOptions<C extends HTMLElement = HTMLDivElement> {
  /** Called whenever the panel closes (dismiss, Escape or programmatic). */
  onClose?: () => void;
  /** Called on every open/close transition. */
  onOpenChange?: (open: boolean) => void;
  /** Event used for outside-click dismissal. */
  dismissEvent?: 'pointerdown' | 'mousedown';
  /** Called after Escape closes the panel (e.g. preventDefault + focus return). */
  onEscape?: (event: KeyboardEvent) => void;
  /**
   * Anchored mode: compute the panel's fixed-position style from the current
   * layout. Runs before paint on open and again on scroll/resize while open.
   * Return null to keep the previous style (e.g. anchor not measurable yet).
   */
  computeStyle?: (container: C | null) => CSSProperties | null;
  /** Close when the container scrolls fully out of the viewport (anchored mode). */
  closeOnViewportExit?: boolean;
}

export interface UseFloatingPanelResult<
  C extends HTMLElement = HTMLDivElement,
  P extends HTMLElement = HTMLDivElement,
> {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Closes when open; computes the anchored style and opens otherwise. */
  toggle: () => void;
  /** Computes the anchored style (when configured) and opens. */
  openPanel: () => void;
  /** Attach to the element containing the trigger (and in-flow panels). */
  containerRef: RefObject<C | null>;
  /** Attach to a portalled panel so outside-click treats it as inside. */
  panelRef: RefObject<P | null>;
  /** Current anchored style; starts hidden until first computed. */
  panelStyle: CSSProperties;
}

export function useFloatingPanel<
  C extends HTMLElement = HTMLDivElement,
  P extends HTMLElement = HTMLDivElement,
>(options: UseFloatingPanelOptions<C> = {}): UseFloatingPanelResult<C, P> {
  const [open, setOpenState] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>(HIDDEN_PANEL_STYLE);
  const containerRef = useRef<C>(null);
  const panelRef = useRef<P>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options; // eslint-disable-line react-hooks/refs

  const anchored = !!options.computeStyle;
  const dismissEvent = options.dismissEvent ?? 'pointerdown';

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) optionsRef.current.onClose?.();
    optionsRef.current.onOpenChange?.(next);
  }, []);

  const applyStyle = useCallback(() => {
    const compute = optionsRef.current.computeStyle;
    if (!compute) return;
    const style = compute(containerRef.current);
    if (style) setPanelStyle(style);
  }, []);

  const openPanel = useCallback(() => {
    applyStyle();
    setOpen(true);
  }, [applyStyle, setOpen]);

  const toggle = useCallback(
    () => (open ? setOpen(false) : openPanel()),
    [open, openPanel, setOpen],
  );

  // Dismiss: outside-click (container or portalled panel) + Escape.
  useEffect(() => {
    if (!open) return;

    const handleOutside = (e: Event) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      optionsRef.current.onEscape?.(e);
    };

    document.addEventListener(dismissEvent, handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener(dismissEvent, handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dismissEvent, open, setOpen]);

  // Anchored mode: position before paint, reposition while scrolled/resized.
  useLayoutEffect(() => {
    if (!open || !anchored) return;

    const update = () => {
      const container = containerRef.current;
      if (!container) return;
      if (optionsRef.current.closeOnViewportExit) {
        const rect = container.getBoundingClientRect();
        // happy-dom/jsdom report 0×0 until layout runs — not off-screen.
        const hasLayout = rect.width > 0 || rect.height > 0;
        if (hasLayout && (rect.top >= window.innerHeight || rect.bottom <= 0)) {
          setOpen(false);
          return;
        }
      }
      applyStyle();
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, { capture: true });
    };
  }, [anchored, applyStyle, open, setOpen]);

  return { open, setOpen, toggle, openPanel, containerRef, panelRef, panelStyle };
}
