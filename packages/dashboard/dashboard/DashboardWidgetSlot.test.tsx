import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardWidgetSlot } from './DashboardWidgetSlot';

const getMock = vi.fn();

vi.mock('@nubitio/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nubitio/core')>();
  return {
    ...actual,
    useCoreHttpClient: () => ({ get: getMock }),
  };
});

afterEach(() => {
  cleanup();
  getMock.mockReset();
});

function renderSlot(widget: Parameters<typeof DashboardWidgetSlot>[0]['widget']) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardWidgetSlot
        widget={widget}
        data={{ used: 999 }}
        editMode={false}
        onHide={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
      />
    </QueryClientProvider>,
  );
}

describe('DashboardWidgetSlot per-widget query', () => {
  it('fetches independently via its own `query` instead of reading the shared dashboard data', async () => {
    getMock.mockResolvedValue({ data: { used: 42, limit: 100 } });

    renderSlot({
      type: 'progress',
      id: 'quota',
      title: 'Quota',
      valuePath: 'used',
      maxPath: 'limit',
      query: { url: '/api/quota', usePeriod: false },
    });

    await waitFor(() => {
      expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('42');
    });
    expect(getMock).toHaveBeenCalledWith('/api/quota', { params: {} });
  });

  it('falls back to the shared dashboard data when no `query` is configured', () => {
    renderSlot({ type: 'progress', id: 'quota', title: 'Quota', valuePath: 'used', max: 999 });
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    expect(getMock).not.toHaveBeenCalled();
  });

  it('shows an inline error when the widget query fails', async () => {
    getMock.mockRejectedValue(new Error('boom'));

    renderSlot({
      type: 'progress',
      id: 'quota',
      title: 'Quota',
      query: { url: '/api/quota', usePeriod: false },
    });

    await waitFor(() => {
      expect(screen.getByText('boom')).toBeTruthy();
    });
  });
});
