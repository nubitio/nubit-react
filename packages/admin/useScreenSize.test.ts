import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** happy-dom's viewport control, which is not part of the DOM lib types. */
const setViewportWidth = (width: number) =>
  (
    window as unknown as { happyDOM: { setViewport: (size: { width: number }) => void } }
  ).happyDOM.setViewport({ width });

/**
 * The module reads `window.matchMedia` once at import time and shares those
 * queries across every consumer, so each breakpoint is exercised by setting the
 * viewport first and importing a fresh copy of the module.
 */
const loadAt = async (width: number) => {
  setViewportWidth(width);
  vi.resetModules();
  return import('./useScreenSize');
};

// Bootstrap 5 breakpoints: x-small < 576 ≤ small < 992 ≤ medium < 1200 ≤ large.
const XSMALL = 480;
const SMALL = 768;
const MEDIUM = 1024;
const LARGE = 1440;

describe('useScreenSize', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    // Unmount first: a hook still mounted when the file ends leaves React work
    // queued that runs after happy-dom tore the window down.
    cleanup();
    vi.useRealTimers();
    setViewportWidth(1024);
  });

  it.each([
    ['x-small', XSMALL, { isXSmall: true, isSmall: false, isMedium: false, isLarge: false }],
    ['small', SMALL, { isXSmall: false, isSmall: true, isMedium: false, isLarge: false }],
    ['medium', MEDIUM, { isXSmall: false, isSmall: false, isMedium: true, isLarge: false }],
    ['large', LARGE, { isXSmall: false, isSmall: false, isMedium: false, isLarge: true }],
  ])('reports exactly one active breakpoint at %s', async (_label, width, expected) => {
    const { useScreenSize } = await loadAt(width);

    const { result } = renderHook(() => useScreenSize());

    expect(result.current).toEqual(expected);
  });

  it('reports the same object shape on every render', async () => {
    const { useScreenSize } = await loadAt(MEDIUM);

    const { result, rerender } = renderHook(() => useScreenSize());
    const before = result.current;
    rerender();

    expect(Object.keys(result.current)).toEqual(Object.keys(before));
  });

  it('unsubscribes on unmount so a later resize cannot reach it', async () => {
    const { useScreenSize } = await loadAt(MEDIUM);

    const { unmount } = renderHook(() => useScreenSize());
    unmount();

    // A resize after teardown must not raise "state update on unmounted".
    expect(() => {
      setViewportWidth(LARGE);
      vi.advanceTimersByTime(100);
    }).not.toThrow();
  });

  it('supports several mounted consumers at once', async () => {
    const { useScreenSize } = await loadAt(LARGE);

    const first = renderHook(() => useScreenSize());
    const second = renderHook(() => useScreenSize());

    expect(first.result.current).toEqual(second.result.current);

    first.unmount();
    expect(second.result.current.isLarge).toBe(true);
  });
});

describe('useScreenSizeClass', () => {
  afterEach(cleanup);

  it.each([
    [XSMALL, 'screen-x-small'],
    [SMALL, 'screen-small'],
    [MEDIUM, 'screen-medium'],
    [LARGE, 'screen-large'],
  ])('maps %ipx to %s', async (width, expected) => {
    const { useScreenSizeClass } = await loadAt(width);

    const { result } = renderHook(() => useScreenSizeClass());

    expect(result.current).toBe(expected);
  });
});
