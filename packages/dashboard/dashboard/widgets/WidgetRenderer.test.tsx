import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WidgetRenderer } from './WidgetRenderer';

describe('WidgetRenderer', () => {
  it('renders a progress widget from valuePath/maxPath', () => {
    render(
      <WidgetRenderer
        widget={{ type: 'progress', id: 'quota', title: 'Quota', valuePath: 'used', maxPath: 'limit' }}
        data={{ used: 30, limit: 120 }}
      />,
    );
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25');
  });

  it('renders a line-chart widget with its series as an SVG chart', () => {
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
        data={{ rows: [{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }] }}
      />,
    );
    expect(screen.getByText('Trend')).toBeTruthy();
  });

  it('renders "No data" for chart widgets when the data path is empty', () => {
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
    expect(screen.getByText('No data')).toBeTruthy();
  });
});
