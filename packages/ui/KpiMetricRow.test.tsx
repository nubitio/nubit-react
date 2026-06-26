import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KpiMetricRow } from './KpiMetricRow';

describe('KpiMetricRow', () => {
  it('renders strip layout with icon and hint', () => {
    render(
      <KpiMetricRow
        layout="strip"
        testId="inventory-summary"
        items={[
          { label: 'SKUs activos', value: '12', icon: 'ph-cube', hint: '3 categorías' },
          { label: 'Sin stock', value: '2', tone: 'danger', icon: 'ph-prohibit', hint: 'Atención' },
        ]}
      />,
    );

    expect(screen.getByTestId('inventory-summary')).toBeTruthy();
    expect(screen.getByText('SKUs activos')).toBeTruthy();
    expect(screen.getByText('3 categorías')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });
});