/**
 * Pins the floating-panel seam: open/dismiss lifecycle, Escape handling and
 * the shared anchored-style geometry that AppDropdown, ContextMenu and the
 * date pickers all consume.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { computeAnchoredStyle, useFloatingPanel, HIDDEN_PANEL_STYLE } from './useFloatingPanel';

function fakeAnchor(rect: Partial<DOMRect>): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () =>
    ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect }) as DOMRect;
  return el;
}

describe('computeAnchoredStyle', () => {
  it('returns the hidden style without an anchor', () => {
    expect(computeAnchoredStyle(null)).toEqual(HIDDEN_PANEL_STYLE);
  });

  it('positions below the anchor with start alignment and matched width', () => {
    window.innerWidth = 1024;
    window.innerHeight = 768;
    const style = computeAnchoredStyle(fakeAnchor({ top: 100, bottom: 130, left: 40, right: 200, width: 160, height: 30 }), {
      matchAnchorWidth: true,
      minWidth: 72,
    });
    expect(style).toMatchObject({ position: 'fixed', left: '40px', width: '160px', top: '134px', visibility: 'visible' });
  });

  it('flips above the anchor when space below drops under the threshold', () => {
    window.innerWidth = 1024;
    window.innerHeight = 768;
    const style = computeAnchoredStyle(fakeAnchor({ top: 700, bottom: 730, left: 40, right: 200, width: 160, height: 30 }), {
      minWidth: 190,
      flipThreshold: 200,
      zIndex: 1600,
    });
    expect(style).toMatchObject({ bottom: `${768 - 700 + 4}px`, top: 'auto', width: '190px', zIndex: 1600 });
  });

  it('right-aligns with end alignment, clamped to the viewport gutter', () => {
    window.innerWidth = 300;
    window.innerHeight = 768;
    const style = computeAnchoredStyle(fakeAnchor({ top: 10, bottom: 40, left: 200, right: 296, width: 96, height: 30 }), {
      align: 'end',
      minWidth: 190,
    });
    expect(style).toMatchObject({ left: `${300 - 190 - 8}px` });
  });
});

describe('useFloatingPanel', () => {
  it('openPanel computes the anchored style before opening', () => {
    const { result } = renderHook(() =>
      useFloatingPanel({ computeStyle: () => ({ left: 10, top: 20 }) }),
    );
    expect(result.current.open).toBe(false);
    expect(result.current.panelStyle).toEqual(HIDDEN_PANEL_STYLE);

    act(() => result.current.openPanel());
    expect(result.current.open).toBe(true);
    expect(result.current.panelStyle).toEqual({ left: 10, top: 20 });
  });

  it('a null computed style keeps the previous position', () => {
    let ready = false;
    const { result } = renderHook(() =>
      useFloatingPanel({ computeStyle: () => (ready ? { left: 1, top: 2 } : null) }),
    );
    const container = document.createElement('div');
    document.body.append(container);
    result.current.containerRef.current = container;

    act(() => result.current.openPanel());
    expect(result.current.panelStyle).toEqual(HIDDEN_PANEL_STYLE);

    ready = true;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.panelStyle).toEqual({ left: 1, top: 2 });
    container.remove();
  });

  it('closes on outside interaction but not on clicks inside container or panel', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useFloatingPanel({ onClose }));
    const container = document.createElement('div');
    const panel = document.createElement('div');
    document.body.append(container, panel);
    result.current.containerRef.current = container;
    result.current.panelRef.current = panel;

    act(() => result.current.setOpen(true));

    act(() => {
      container.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      panel.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(result.current.open).toBe(true);

    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(result.current.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    container.remove();
    panel.remove();
  });

  it('Escape closes and notifies onEscape', () => {
    const onEscape = vi.fn();
    const { result } = renderHook(() => useFloatingPanel({ onEscape }));
    act(() => result.current.setOpen(true));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(result.current.open).toBe(false);
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('reports every transition through onOpenChange', () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() => useFloatingPanel({ onOpenChange }));
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(onOpenChange.mock.calls.map(([v]) => v)).toEqual([true, false]);
  });
});
