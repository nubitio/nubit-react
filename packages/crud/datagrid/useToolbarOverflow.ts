import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * How many trailing toolbar actions to move into the overflow menu.
 *
 * `maxInline` is a hard cap. Beyond it the hook collapses one more action at a
 * time while the toolbar still overflows (a child wrapped to a second line, or
 * the content is wider than the box), and starts over whenever the toolbar is
 * resized so actions come back when there is room again. The loop is bounded by
 * `count` and settles in the layout phase, before the browser paints.
 */
export function useToolbarOverflow(
  ref: RefObject<HTMLElement | null>,
  count: number,
  maxInline: number | undefined,
): number {
  // Collapsed count measured for one `count`; a different count starts over from zero.
  const [measured, setMeasured] = useState({ count, hidden: 0 });
  const auto = measured.count === count ? measured.hidden : 0;
  const forced = maxInline === undefined ? 0 : Math.max(0, count - Math.max(0, maxInline));
  const hidden = Math.min(count, Math.max(auto, forced));

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || hidden >= count) return;
    const first = element.firstElementChild as HTMLElement | null;
    const last = element.lastElementChild as HTMLElement | null;
    if (!first || !last) return;
    const wrapped = last.offsetTop - first.offsetTop > first.offsetHeight / 2;
    if (wrapped || element.scrollWidth > element.clientWidth + 1)
      setMeasured({ count, hidden: hidden + 1 });
    // `measured` is a dependency so a resize re-measures even when the count is unchanged.
  }, [ref, hidden, count, measured]);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      setMeasured({ count, hidden: 0 });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, count]);

  return hidden;
}
