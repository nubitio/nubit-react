import { describe, expect, it, vi } from 'vitest';
import type { CoreHttpClient } from '@nubitio/core';
import { HydraAdapter } from '../adapter/HydraAdapter';
import { loadDetailRows } from './loadDetailRows';

function mockHttpClient(get: CoreHttpClient['get']): CoreHttpClient {
  return { get } as CoreHttpClient;
}

describe('loadDetailRows', () => {
  it('unwraps plain json arrays', async () => {
    const httpClient = mockHttpClient(
      vi.fn().mockResolvedValue({
        data: [{ id: 1, quantity: '2.00' }],
      }),
    );

    const rows = await loadDetailRows(httpClient, '/api/sales_document_lines?document=9', HydraAdapter);

    expect(rows).toEqual([{ id: 1, quantity: '2.00' }]);
  });

  it('unwraps hydra collections', async () => {
    const httpClient = mockHttpClient(
      vi.fn().mockResolvedValue({
        data: {
          'hydra:member': [{ '@id': '/api/sales_document_lines/1', quantity: '1.00' }],
          'hydra:totalItems': 1,
        },
      }),
    );

    const rows = await loadDetailRows(httpClient, '/api/sales_document_lines', HydraAdapter);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.quantity).toBe('1.00');
  });
});