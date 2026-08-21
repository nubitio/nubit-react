import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNotifications } from './useNotifications';

const getMock = vi.fn();
const patchMock = vi.fn();
const mercureSubscriptionMock = vi.fn();

vi.mock('@nubitio/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nubitio/core')>();
  return {
    ...actual,
    useCoreHttpClient: () => ({ get: getMock, patch: patchMock }),
    useMercureSubscription: (...args: unknown[]) => mercureSubscriptionMock(...args),
  };
});

afterEach(() => {
  getMock.mockReset();
  patchMock.mockReset();
  mercureSubscriptionMock.mockReset();
});

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useNotifications', () => {
  it('reads a Hydra collection response into items and computes unread count', async () => {
    getMock.mockResolvedValue({
      data: {
        'hydra:member': [
          { id: 1, subject: 'A', body: 'a', read: false, createdAt: '2026-08-20T10:00:00Z' },
          { id: 2, subject: 'B', body: 'b', read: true, createdAt: '2026-08-19T10:00:00Z' },
        ],
      },
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.unreadCount).toBe(1);
  });

  it('reads a plain array response too', async () => {
    getMock.mockResolvedValue({
      data: [{ id: 1, subject: 'A', body: 'a', read: false, createdAt: '2026-08-20T10:00:00Z' }],
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
  });

  it('subscribes to Mercure updates for the notifications collection URL', async () => {
    getMock.mockResolvedValue({ data: [] });

    renderHook(() => useNotifications({ apiUrl: '/api/notifications' }), { wrapper });

    await waitFor(() => expect(mercureSubscriptionMock).toHaveBeenCalled());
    expect(mercureSubscriptionMock.mock.calls[0][0]).toBe('/api/notifications');
  });

  it('marks a notification read via a merge-patch call', async () => {
    getMock.mockResolvedValue({ data: [] });
    patchMock.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.markAsRead(7);

    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith('/api/notifications/7', { read: true }),
    );
  });
});
