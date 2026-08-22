import { useCallback, useMemo, useRef, useState } from 'react';
import type { GridData } from '@nubitio/core';
import type { DataRecord } from '@nubitio/core';

export interface CursorPaginationState {
  /** True once a page has been loaded and the server offered a next link. */
  hasNext: boolean;
  hasPrevious: boolean;
  /** How many pages deep the walk currently is, one-based. */
  page: number;
  /** The URL to load next, or null at the end. */
  nextUrl: string | null;
}

/**
 * Walks a cursor-paginated collection.
 *
 * Cursor pages cannot be addressed by number: each one is defined by the last
 * row of the one before it. That rules out the two things an offset grid does
 * freely — jumping to page 400, and showing "page 12 of 500" — and there is no
 * way to fake either without asking the database for exactly the count the
 * cursor was adopted to avoid.
 *
 * So the walk is kept as a trail of URLs the *server* produced. Going back is
 * re-visiting a link that was already followed, which is correct even when rows
 * were inserted meanwhile; deriving the previous cursor client-side would drift
 * from the sequence the server is actually serving.
 */
export function useCursorPagination() {
  // Every page's URL, in the order visited. The first entry is the unpaginated
  // request, which is what makes "back to the start" trivial and exact.
  const trail = useRef<(string | null)[]>([null]);
  const [index, setIndex] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);

  const observe = useCallback((result: GridData<DataRecord>) => {
    setNextUrl(result.nextPageUrl ?? null);
  }, []);

  const goNext = useCallback((): string | null => {
    if (nextUrl === null) return null;

    // Truncate anything ahead of the current position: stepping back and then
    // forward again must not resurrect a stale trail.
    trail.current = [...trail.current.slice(0, index + 1), nextUrl];
    setIndex(index + 1);

    return nextUrl;
  }, [index, nextUrl]);

  const goPrevious = useCallback((): string | null => {
    if (index === 0) return null;

    setIndex(index - 1);
    return trail.current[index - 1] ?? null;
  }, [index]);

  const reset = useCallback(() => {
    trail.current = [null];
    setIndex(0);
    setNextUrl(null);
  }, []);

  const state = useMemo<CursorPaginationState>(
    () => ({ hasNext: nextUrl !== null, hasPrevious: index > 0, page: index + 1, nextUrl }),
    [index, nextUrl],
  );

  return { state, observe, goNext, goPrevious, reset };
}
