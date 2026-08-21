import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ResourceExportResult, ResourceStore } from '../data/ResourceStore';
import type { Field } from '../field/Field';
import { useGridExport } from './useGridExport';

const baseProps = {
  fields: [] as Field[],
  filters: {},
  filterOperators: {},
  sort: [] as Array<{ selector: string; desc: boolean }>,
};

describe('useGridExport', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reports canExport=false when the store has no export method', () => {
    const source = {} as ResourceStore;
    const { result } = renderHook(() => useGridExport({ source, ...baseProps }));

    expect(result.current.canExport).toBe(false);
  });

  it('downloads the returned blob under its server-provided filename', async () => {
    const exportResult: ResourceExportResult = { blob: new Blob(['x']), filename: 'products.xlsx' };
    const exportFn = vi.fn().mockResolvedValue(exportResult);
    const source = { load: vi.fn(), export: exportFn } as unknown as ResourceStore;

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    const { result } = renderHook(() => useGridExport({ source, ...baseProps }));
    expect(result.current.canExport).toBe(true);

    await act(async () => {
      await result.current.runExport();
    });

    expect(exportFn).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportError).toBeNull();
  });

  it('exposes the error and stops loading when the export request fails', async () => {
    const failure = new Error('network down');
    const source = { load: vi.fn(), export: vi.fn().mockRejectedValue(failure) } as unknown as ResourceStore;

    const { result } = renderHook(() => useGridExport({ source, ...baseProps }));

    await act(async () => {
      await result.current.runExport();
    });

    await waitFor(() => expect(result.current.exportError).toBe(failure));
    expect(result.current.isExporting).toBe(false);
  });

  it('is a no-op when the store cannot export', async () => {
    const source = { load: vi.fn() } as unknown as ResourceStore;
    const { result } = renderHook(() => useGridExport({ source, ...baseProps }));

    await act(async () => {
      await result.current.runExport();
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportError).toBeNull();
  });
});
