import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useComboboxOptions, type ComboboxLoader, type ComboboxPage } from './useComboboxOptions';

afterEach(cleanup);

const defaults = {
  options: [],
  selected: [],
  open: true,
  query: 'old',
  debounceMs: 0,
  minSearchLength: 0,
};

describe('remote combobox options', () => {
  it('ignores out-of-order responses even when a loader ignores its AbortSignal', async () => {
    const pending: Array<{ resolve: (page: ComboboxPage) => void; signal: AbortSignal }> = [];
    const loader: ComboboxLoader = (_query, { signal }) =>
      new Promise((resolve) => pending.push({ resolve, signal }));
    const { result, rerender } = renderHook(
      ({ query }) => useComboboxOptions({ ...defaults, query, loadOptions: loader }),
      { initialProps: { query: 'old' } },
    );
    await waitFor(() => expect(pending).toHaveLength(1));
    rerender({ query: 'new' });
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[0].signal.aborted).toBe(true);
    await act(async () => pending[1].resolve({ options: [{ value: 'new', label: 'New' }] }));
    await act(async () => pending[0].resolve({ options: [{ value: 'old', label: 'Old' }] }));
    expect(result.current.items.map((item) => item.value)).toEqual(['new']);
  });

  it('cancels when the query drops below the threshold and preserves a pinned selection', async () => {
    let resolve!: (page: ComboboxPage) => void;
    let signal!: AbortSignal;
    const loader: ComboboxLoader = (_query, context) => {
      signal = context.signal;
      return new Promise((done) => {
        resolve = done;
      });
    };
    const { result, rerender } = renderHook(
      ({ query }) =>
        useComboboxOptions({
          ...defaults,
          options: [{ value: 'selected', label: 'Selected' }],
          selected: ['selected'],
          query,
          minSearchLength: 2,
          loadOptions: loader,
        }),
      { initialProps: { query: 'query' } },
    );
    await waitFor(() => expect(signal).toBeDefined());
    rerender({ query: '' });
    expect(signal.aborted).toBe(true);
    await act(async () => resolve({ options: [{ value: 'stale', label: 'Stale' }] }));
    expect(result.current.items.map((item) => item.value)).toEqual(['selected']);
    expect(result.current.loading).toBe(false);
  });

  it('appends and deduplicates pages, then stops when the cursor is absent', async () => {
    const loader = vi
      .fn<ComboboxLoader>()
      .mockResolvedValueOnce({ options: [{ value: 'one', label: 'One' }], nextCursor: 50 })
      .mockResolvedValueOnce({
        options: [
          { value: 'one', label: 'One' },
          { value: 'two', label: 'Two' },
        ],
        nextCursor: null,
      });
    const { result } = renderHook(() => useComboboxOptions({ ...defaults, loadOptions: loader }));
    await waitFor(() => expect(result.current.hasMore).toBe(true));
    await act(() => result.current.loadMore());
    expect(loader.mock.calls[1][1].cursor).toBe(50);
    expect(result.current.items.map((item) => item.value)).toEqual(['one', 'two']);
    await act(() => result.current.loadMore());
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('reports errors and retries, and aborts on unmount', async () => {
    const loader = vi
      .fn<ComboboxLoader>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ options: [{ value: 'one', label: 'One' }] });
    const { result, unmount } = renderHook(() =>
      useComboboxOptions({ ...defaults, loadOptions: loader }),
    );
    await waitFor(() => expect(result.current.failed).toBe(true));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    unmount();
    expect(loader.mock.calls[1][1].signal.aborted).toBe(true);
  });
});
