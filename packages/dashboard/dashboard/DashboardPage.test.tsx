import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { DashboardPage } from './DashboardPage';
import type { DashboardConfig } from './types';

afterEach(cleanup);

function renderDashboard(config: DashboardConfig) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage config={config} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const baseConfig: DashboardConfig = {
  id: 'test-dashboard',
  title: 'Test Dashboard',
  customizable: true,
  useData: () => ({ data: {} }),
  sections: [
    {
      id: 'kpis',
      layout: 'stats',
      widgets: [
        { type: 'stat', id: 'a', title: 'Widget A', value: 1 },
        { type: 'stat', id: 'b', title: 'Widget B', value: 2 },
      ],
    },
  ],
};

describe('DashboardPage customization', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('hides a widget via the edit-mode control and lists it as restorable', async () => {
    const user = userEvent.setup();
    renderDashboard(baseConfig);

    await user.click(screen.getByRole('button', { name: 'Customize dashboard' }));
    expect(screen.getByText('Widget A')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Hide Widget A' }));
    expect(screen.queryByText('Widget A')).toBeNull();

    await user.click(screen.getByRole('button', { name: /Hidden widgets/ }));
    expect(screen.getByText('Show')).toBeTruthy();
  });

  it('restoring a hidden widget brings it back', async () => {
    const user = userEvent.setup();
    renderDashboard(baseConfig);

    await user.click(screen.getByRole('button', { name: 'Customize dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Hide Widget A' }));
    await user.click(screen.getByRole('button', { name: /Hidden widgets/ }));
    await user.click(screen.getByRole('button', { name: 'Show' }));

    expect(screen.getByText('Widget A')).toBeTruthy();
  });

  it('persists the layout to localStorage', async () => {
    const user = userEvent.setup();
    renderDashboard(baseConfig);

    await user.click(screen.getByRole('button', { name: 'Customize dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Hide Widget A' }));

    const stored = JSON.parse(window.localStorage.getItem('nb-dashboard-layout:test-dashboard') ?? '{}');
    expect(stored.kpis.hidden).toEqual(['a']);
  });

  it('does not render layout controls when customizable is not set', () => {
    renderDashboard({ ...baseConfig, customizable: false });
    expect(screen.queryByRole('button', { name: 'Customize dashboard' })).toBeNull();
  });
});
