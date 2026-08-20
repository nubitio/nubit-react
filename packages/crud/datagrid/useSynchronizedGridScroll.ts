import { useLayoutEffect, type RefObject } from 'react';

interface GridScrollRefs {
  theadRef: RefObject<HTMLTableSectionElement | null>;
  tbodyRef: RefObject<HTMLTableSectionElement | null>;
  tfootRef: RefObject<HTMLTableSectionElement | null>;
  hScrollRef: RefObject<HTMLDivElement | null>;
  syncRef: RefObject<(() => void) | null>;
}

interface GridScrollDependencies {
  rowsLength: number;
  visibleFieldCount: number;
  colWidths: Record<string, number>;
  containerWidth: number;
  summaryFieldCount: number;
}

/** Keeps split table sections and the single visible horizontal scrollbar aligned. */
export function useSynchronizedGridScroll(
  refs: GridScrollRefs,
  dependencies: GridScrollDependencies,
): void {
  const { theadRef, tbodyRef, tfootRef, hScrollRef, syncRef } = refs;
  const { rowsLength, visibleFieldCount, colWidths, containerWidth, summaryFieldCount } =
    dependencies;

  useLayoutEffect(() => {
    const tbody = tbodyRef.current;
    const thead = theadRef.current;
    const tfoot = tfootRef.current;
    const hScroll = hScrollRef.current;
    if (!tbody) return;

    let syncing = false;
    const applyScrollLeft = (scrollLeft: number) => {
      syncing = true;
      if (tbody.scrollLeft !== scrollLeft) tbody.scrollLeft = scrollLeft;
      if (thead && thead.scrollLeft !== scrollLeft) thead.scrollLeft = scrollLeft;
      if (tfoot && tfoot.scrollLeft !== scrollLeft) tfoot.scrollLeft = scrollLeft;
      if (hScroll && hScroll.scrollLeft !== scrollLeft) hScroll.scrollLeft = scrollLeft;
      syncing = false;
    };
    const clampAndSync = () => {
      const maxScroll = Math.max(0, tbody.scrollWidth - tbody.clientWidth);
      applyScrollLeft(Math.min(tbody.scrollLeft, maxScroll));
    };

    syncRef.current = clampAndSync;
    clampAndSync();

    const onBodyScroll = () => {
      if (!syncing) applyScrollLeft(tbody.scrollLeft);
    };
    const onFooterScroll = () => {
      if (!syncing && hScroll) applyScrollLeft(hScroll.scrollLeft);
    };
    const onWheel = (event: WheelEvent) => {
      const delta = event.deltaX !== 0 ? event.deltaX : event.shiftKey ? event.deltaY : 0;
      if (delta === 0) return;
      const maxScroll = Math.max(0, tbody.scrollWidth - tbody.clientWidth);
      if (maxScroll === 0) return;
      event.preventDefault();
      applyScrollLeft(Math.min(maxScroll, Math.max(0, tbody.scrollLeft + delta)));
    };

    tbody.addEventListener('scroll', onBodyScroll, { passive: true });
    tbody.addEventListener('wheel', onWheel, { passive: false });
    hScroll?.addEventListener('scroll', onFooterScroll, { passive: true });

    const observer = new ResizeObserver(clampAndSync);
    observer.observe(tbody);
    if (thead) observer.observe(thead);
    if (tfoot) observer.observe(tfoot);

    return () => {
      tbody.removeEventListener('scroll', onBodyScroll);
      tbody.removeEventListener('wheel', onWheel);
      hScroll?.removeEventListener('scroll', onFooterScroll);
      observer.disconnect();
    };
  }, [
    colWidths,
    containerWidth,
    hScrollRef,
    rowsLength,
    summaryFieldCount,
    syncRef,
    tbodyRef,
    tfootRef,
    theadRef,
    visibleFieldCount,
  ]);
}
