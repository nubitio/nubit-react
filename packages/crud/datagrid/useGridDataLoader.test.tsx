import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DataRecord } from '@nubitio/core';
import type { ResourceLoadResult, ResourceStore } from '../data/ResourceStore';
import type { Field } from '../field/Field';
import { useGridDataLoader } from './useGridDataLoader';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const result = (id: number): ResourceLoadResult<DataRecord> => ({
  data: [{ id }],
  totalCount: 1,
  summary: null,
  gridSummary: null,
});

describe('useGridDataLoader', () => {
  it('keeps the newest response when an older request finishes last', async () => {
    const first = deferred<ResourceLoadResult>();
    const second = deferred<ResourceLoadResult>();
    const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const source = { load } as ResourceStore;
    const fields: Field[] = [];
    const filters = {};
    const filterOperators = {};
    const sort: Array<{ selector: string; desc: boolean }> = [];
    const onContentReady = vi.fn();

    const { result: hook, rerender } = renderHook(
      ({ page }) =>
        useGridDataLoader({
          source,
          fields,
          filters,
          filterOperators,
          sort,
          page,
          pageSize: 20,
          paging: true,
          manualLoad: false,
          onContentReady,
        }),
      { initialProps: { page: 0 } },
    );

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    rerender({ page: 1 });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));

    await act(async () => second.resolve(result(2)));
    await waitFor(() => expect(hook.current.rows).toEqual([{ id: 2 }]));
    await act(async () => first.resolve(result(1)));

    expect(hook.current.rows).toEqual([{ id: 2 }]);
    expect(onContentReady).toHaveBeenCalledTimes(1);
  });

  it('uses supplied rows without crossing the ResourceStore seam', async () => {
    const load = vi.fn();
    const source = { load } as ResourceStore;
    const data = [{ id: 7 }];
    const fields: Field[] = [];
    const filters = {};
    const filterOperators = {};
    const sort: Array<{ selector: string; desc: boolean }> = [];
    const onContentReady = () => {};
    const suppliedGridSummary = { amount: 10 };

    const { result: hook } = renderHook(() =>
      useGridDataLoader({
        source,
        fields,
        filters,
        filterOperators,
        sort,
        page: 0,
        pageSize: 20,
        paging: true,
        manualLoad: false,
        data,
        suppliedGridSummary,
        onContentReady,
      }),
    );

    await waitFor(() => expect(hook.current.rows).toEqual(data));
    expect(hook.current.gridSummary).toEqual({ amount: 10 });
    expect(load).not.toHaveBeenCalled();
  });
});
