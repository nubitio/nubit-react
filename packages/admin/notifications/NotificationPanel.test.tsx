import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationPanel } from './NotificationPanel';

const getMock = vi.fn();
const patchMock = vi.fn();

vi.mock('@nubitio/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nubitio/core')>();
  return {
    ...actual,
    useCoreHttpClient: () => ({ get: getMock, patch: patchMock }),
    useMercureSubscription: () => {},
  };
});

afterEach(() => {
  cleanup();
  getMock.mockReset();
  patchMock.mockReset();
});

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationPanel />
    </QueryClientProvider>,
  );
}

describe('NotificationPanel', () => {
  it('shows the empty state when there are no notifications', async () => {
    getMock.mockResolvedValue({ data: [] });

    renderPanel();

    await waitFor(() => expect(screen.getByText("You're all caught up")).toBeTruthy());
  });

  it('renders each notification and marks it read on click', async () => {
    getMock.mockResolvedValue({
      data: [
        {
          id: 1,
          subject: 'Invoice confirmed',
          body: 'INV-0001',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    patchMock.mockResolvedValue({ data: {} });

    renderPanel();

    const item = await screen.findByText('Invoice confirmed');
    await userEvent.click(item);

    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith('/api/notifications/1', { read: true }),
    );
  });

  it('shows a "mark all as read" action only when there are unread notifications', async () => {
    getMock.mockResolvedValue({
      data: [
        {
          id: 1,
          subject: 'Read already',
          body: '',
          read: true,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderPanel();

    await screen.findByText('Read already');
    expect(screen.queryByText('Mark all as read')).toBeNull();
  });
});
