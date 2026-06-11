import { afterEach, describe, expect, it } from 'vitest';
import { configureCore } from '@nubitio/core';
import { formatSummaryValue } from './SummaryUtils';

describe('formatSummaryValue currency resolution', () => {
  afterEach(() => configureCore({ currency: undefined }));

  it('uses the explicit item currency first', () => {
    configureCore({ currency: 'USD' });
    const text = formatSummaryValue(10, { valueFormat: 'currency', currency: 'EUR' });
    expect(text).toContain('€');
  });

  it('falls back to the app-wide CoreConfig currency', () => {
    configureCore({ currency: 'PEN' });
    const text = formatSummaryValue(10, { valueFormat: 'currency' });
    expect(text).toMatch(/PEN|S\//);
  });

  it('formats as plain fixed-point when no currency is configured anywhere', () => {
    const text = formatSummaryValue(1980.04, { valueFormat: 'currency' });
    expect(text).not.toMatch(/PEN|S\/|\$|€/);
    expect(text).toMatch(/^1.?980[.,]04$/); // plain number, locale grouping rules apply
  });
});
