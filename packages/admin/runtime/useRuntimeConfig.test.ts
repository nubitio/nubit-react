import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRuntimeConfig } from './useRuntimeConfig';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('useRuntimeConfig', () => {
  it('loads the config from the API with credentials', async () => {
    fetchMock.mockResolvedValue(json({ flag: true }));

    const { result } = renderHook(() => useRuntimeConfig({ apiBaseUrl: '/api/' }));

    await waitFor(() => expect(result.current.config).toEqual({ flag: true }));
    expect(fetchMock).toHaveBeenCalledWith('/api/runtime-config', { credentials: 'include' });
    expect(result.current.error).toBe(false);
  });

  it('joins base URL and path without doubling slashes', async () => {
    fetchMock.mockResolvedValue(json({}));

    renderHook(() => useRuntimeConfig({ apiBaseUrl: '/api///', path: '/custom' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/custom');
  });

  it('reports an error for a non-OK response', async () => {
    fetchMock.mockResolvedValue(json({}, false));

    const { result } = renderHook(() => useRuntimeConfig());

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.config).toBeNull();
  });

  it('reports an error when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useRuntimeConfig());

    await waitFor(() => expect(result.current.error).toBe(true));
  });

  it('does not fetch when disabled', async () => {
    const { result } = renderHook(() => useRuntimeConfig({ enabled: false }));

    await waitFor(() => expect(result.current.state.status).toBe('idle'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes on demand', async () => {
    fetchMock.mockResolvedValueOnce(json({ v: 1 })).mockResolvedValueOnce(json({ v: 2 }));

    const { result } = renderHook(() => useRuntimeConfig());
    await waitFor(() => expect(result.current.config).toEqual({ v: 1 }));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.config).toEqual({ v: 2 });
  });
});
