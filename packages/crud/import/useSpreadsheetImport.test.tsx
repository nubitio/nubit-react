import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSpreadsheetImport } from './useSpreadsheetImport';

const postMock = vi.fn();

vi.mock('@nubitio/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nubitio/core')>();
  return {
    ...actual,
    useCoreHttpClient: () => ({ post: postMock }),
  };
});

afterEach(() => postMock.mockReset());

const report = {
  rows: 2,
  valid: 2,
  invalid: 0,
  inserts: 2,
  updates: 0,
  errorCount: 0,
  errors: [],
  truncatedErrors: false,
  applied: false,
};

const session = {
  id: 'import-1',
  resource: 'App\\Entity\\Product',
  filename: 'products.csv',
  status: 'analyzed' as const,
  numberFormat: 'auto',
  mapping: { sku: 0, name: 1 },
  report,
  createdAt: '2026-03-01T00:00:00+00:00',
  appliedAt: null,
  createdBy: 'admin@example.com',
};

const file = () => new File(['sku,name\nSKU-1,Widget\n'], 'products.csv', { type: 'text/csv' });

describe('useSpreadsheetImport', () => {
  it('uploads the file and lands in review, not applied', async () => {
    postMock.mockResolvedValue({ data: session });

    const { result } = renderHook(() => useSpreadsheetImport('/api/imports/products'));

    await act(async () => {
      await result.current.analyze(file());
    });

    expect(result.current.state.status).toBe('reviewing');

    const [url, body] = postMock.mock.calls[0];
    expect(url).toBe('/api/imports/products');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('numberFormat')).toBe('auto');
  });

  it('passes the declared number format through', async () => {
    postMock.mockResolvedValue({ data: session });

    const { result } = renderHook(() => useSpreadsheetImport('/api/imports/products'));

    await act(async () => {
      await result.current.analyze(file(), 'comma');
    });

    expect((postMock.mock.calls[0][1] as FormData).get('numberFormat')).toBe('comma');
  });

  /**
   * The guard that matters: nothing can be applied that was not analysed. A
   * client able to skip the review step would defeat the whole design.
   */
  it('refuses to confirm before anything has been analysed', async () => {
    const { result } = renderHook(() => useSpreadsheetImport('/api/imports/products'));

    await act(async () => {
      await result.current.confirm();
    });

    expect(postMock).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('idle');
  });

  it('applies a reviewed session', async () => {
    postMock.mockResolvedValueOnce({ data: session });
    postMock.mockResolvedValueOnce({
      data: { ...session, status: 'applied', appliedAt: '2026-03-01T00:01:00+00:00' },
    });

    const { result } = renderHook(() => useSpreadsheetImport('/api/imports/products'));

    await act(async () => {
      await result.current.analyze(file());
    });
    await act(async () => {
      await result.current.confirm();
    });

    expect(postMock).toHaveBeenLastCalledWith('/api/imports/import-1/confirm', {});
    expect(result.current.state.status).toBe('applied');
  });

  it('surfaces a refusal instead of pretending the import happened', async () => {
    postMock.mockResolvedValueOnce({ data: session });
    postMock.mockRejectedValueOnce(new Error('2 row(s) are still invalid'));

    const { result } = renderHook(() => useSpreadsheetImport('/api/imports/products'));

    await act(async () => {
      await result.current.analyze(file());
    });
    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.state).toEqual({
      status: 'error',
      message: '2 row(s) are still invalid',
    });
  });

  it('reports an unreadable file rather than hanging on the spinner', async () => {
    postMock.mockRejectedValue(new Error('unsupported format'));

    const { result } = renderHook(() => useSpreadsheetImport('/api/imports/products'));

    await act(async () => {
      await result.current.analyze(file());
    });

    expect(result.current.state).toEqual({ status: 'error', message: 'unsupported format' });
  });

  it('goes back to the start on reset', async () => {
    postMock.mockResolvedValue({ data: session });

    const { result } = renderHook(() => useSpreadsheetImport('/api/imports/products'));

    await act(async () => {
      await result.current.analyze(file());
    });
    act(() => result.current.reset());

    expect(result.current.state).toEqual({ status: 'idle' });
  });
});
