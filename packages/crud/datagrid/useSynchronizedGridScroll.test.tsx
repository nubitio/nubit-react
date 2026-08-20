import { createRef } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSynchronizedGridScroll } from './useSynchronizedGridScroll';

class ResizeObserverStub {
  static observed: Element[] = [];
  observe(element: Element) {
    ResizeObserverStub.observed.push(element);
  }
  disconnect = vi.fn();
}

describe('useSynchronizedGridScroll', () => {
  afterEach(() => {
    ResizeObserverStub.observed = [];
    vi.unstubAllGlobals();
  });

  it('synchronizes body scrolling across the split table sections', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const tfoot = document.createElement('tfoot');
    const scrollbar = document.createElement('div');
    Object.defineProperties(tbody, {
      scrollWidth: { value: 500 },
      clientWidth: { value: 200 },
    });

    const theadRef = createRef<HTMLTableSectionElement>();
    const tbodyRef = createRef<HTMLTableSectionElement>();
    const tfootRef = createRef<HTMLTableSectionElement>();
    const hScrollRef = createRef<HTMLDivElement>();
    const syncRef = createRef<() => void>();
    theadRef.current = thead;
    tbodyRef.current = tbody;
    tfootRef.current = tfoot;
    hScrollRef.current = scrollbar;
    syncRef.current = () => {};

    renderHook(() =>
      useSynchronizedGridScroll(
        { theadRef, tbodyRef, tfootRef, hScrollRef, syncRef },
        {
          rowsLength: 1,
          visibleFieldCount: 2,
          colWidths: {},
          containerWidth: 200,
          summaryFieldCount: 0,
        },
      ),
    );

    act(() => {
      tbody.scrollLeft = 120;
      tbody.dispatchEvent(new Event('scroll'));
    });

    expect(thead.scrollLeft).toBe(120);
    expect(tfoot.scrollLeft).toBe(120);
    expect(scrollbar.scrollLeft).toBe(120);
    expect(ResizeObserverStub.observed).toEqual([tbody, thead, tfoot]);
  });

  it('forwards shift-wheel gestures and clamps them to the available range', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    const tbody = document.createElement('tbody');
    Object.defineProperties(tbody, {
      scrollWidth: { value: 500 },
      clientWidth: { value: 200 },
    });
    const tbodyRef = createRef<HTMLTableSectionElement>();
    const theadRef = createRef<HTMLTableSectionElement>();
    const tfootRef = createRef<HTMLTableSectionElement>();
    const hScrollRef = createRef<HTMLDivElement>();
    const syncRef = createRef<() => void>();
    tbodyRef.current = tbody;
    syncRef.current = () => {};

    renderHook(() =>
      useSynchronizedGridScroll(
        { theadRef, tbodyRef, tfootRef, hScrollRef, syncRef },
        {
          rowsLength: 1,
          visibleFieldCount: 1,
          colWidths: {},
          containerWidth: 200,
          summaryFieldCount: 0,
        },
      ),
    );

    act(() => {
      tbody.dispatchEvent(new WheelEvent('wheel', { deltaX: 400, cancelable: true }));
    });

    expect(tbody.scrollLeft).toBe(300);
  });
});
