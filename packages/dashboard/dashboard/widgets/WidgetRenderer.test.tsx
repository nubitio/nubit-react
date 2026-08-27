import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WidgetRenderer } from './WidgetRenderer';

describe('WidgetRenderer', () => {
  it('renders a progress widget from valuePath/maxPath', () => {
    render(
      <WidgetRenderer
        widget={{
          type: 'progress',
          id: 'quota',
          title: 'Quota',
          valuePath: 'used',
          maxPath: 'limit',
        }}
        data={{ used: 30, limit: 120 }}
      />,
    );
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25');
  });

  it('renders a line-chart widget with its series as an SVG chart', async () => {
    render(
      <WidgetRenderer
        widget={{
          type: 'line-chart',
          id: 'trend',
          title: 'Trend',
          dataPath: 'rows',
          xKey: 'label',
          series: [{ key: 'value' }],
          height: 120,
        }}
        data={{
          rows: [
            { label: 'Jan', value: 10 },
            { label: 'Feb', value: 20 },
          ],
        }}
      />,
    );
    // line-chart se carga diferido para dejar recharts fuera del entry.
    expect(await screen.findByText('Trend')).toBeTruthy();
  });

  it('renders "No data" for chart widgets when the data path is empty', async () => {
    render(
      <WidgetRenderer
        widget={{
          type: 'area-chart',
          id: 'empty',
          title: 'Empty',
          dataPath: 'rows',
          xKey: 'label',
          series: [{ key: 'value' }],
        }}
        data={{ rows: [] }}
      />,
    );
    expect(await screen.findByText('No data')).toBeTruthy();
  });
});
