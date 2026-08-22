import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCursorPagination } from './useCursorPagination';

const page = (nextPageUrl: string | null) => ({
  data: [],
  totalCount: 0,
  summary: null,
  nextPageUrl,
});

describe('useCursorPagination', () => {
  it('starts at the first page with nowhere to go', () => {
    const { result } = renderHook(() => useCursorPagination());

    expect(result.current.state).toEqual({
      hasNext: false,
      hasPrevious: false,
      page: 1,
      nextUrl: null,
    });
  });

  it('offers the next page only once the server has published a link', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.observe(page('/api/entries?id[lt]=90')));

    expect(result.current.state.hasNext).toBe(true);
    expect(result.current.state.nextUrl).toBe('/api/entries?id[lt]=90');
  });

  /**
   * The trail is the server's own links. Deriving the previous cursor
   * client-side would drift from the sequence actually being served.
   */
  it('walks forward and back over the links it was given', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.observe(page('/api/entries?id[lt]=90')));
    act(() => {
      expect(result.current.goNext()).toBe('/api/entries?id[lt]=90');
    });
    expect(result.current.state.page).toBe(2);

    act(() => result.current.observe(page('/api/entries?id[lt]=80')));
    act(() => {
      expect(result.current.goNext()).toBe('/api/entries?id[lt]=80');
    });
    expect(result.current.state.page).toBe(3);

    act(() => {
      expect(result.current.goPrevious()).toBe('/api/entries?id[lt]=90');
    });
    expect(result.current.state.page).toBe(2);

    // The first entry is the unpaginated request, which is what makes going
    // back to the start exact rather than reconstructed.
    act(() => {
      expect(result.current.goPrevious()).toBeNull();
    });
    expect(result.current.state.page).toBe(1);
  });

  it('cannot go back from the first page', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => {
      expect(result.current.goPrevious()).toBeNull();
    });

    expect(result.current.state.page).toBe(1);
  });

  it('cannot go forward past the end', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.observe(page(null)));
    act(() => {
      expect(result.current.goNext()).toBeNull();
    });

    expect(result.current.state.page).toBe(1);
  });

  /** Stepping back and forward again must not resurrect a stale trail. */
  it('discards the forward trail after stepping back and taking a new link', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.observe(page('/api/entries?id[lt]=90')));
    act(() => void result.current.goNext());
    act(() => result.current.observe(page('/api/entries?id[lt]=80')));
    act(() => void result.current.goNext());
    act(() => void result.current.goPrevious());

    act(() => result.current.observe(page('/api/entries?id[lt]=85')));
    act(() => {
      expect(result.current.goNext()).toBe('/api/entries?id[lt]=85');
    });

    act(() => {
      expect(result.current.goPrevious()).toBe('/api/entries?id[lt]=90');
    });
  });

  it('returns to the start on reset', () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.observe(page('/api/entries?id[lt]=90')));
    act(() => void result.current.goNext());
    act(() => result.current.reset());

    expect(result.current.state).toEqual({
      hasNext: false,
      hasPrevious: false,
      page: 1,
      nextUrl: null,
    });
  });
});
