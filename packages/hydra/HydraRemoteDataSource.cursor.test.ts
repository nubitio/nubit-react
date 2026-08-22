import { describe, expect, it } from 'vitest';
import { HydraRemoteDataSource } from './HydraRemoteDataSource';
import type { CoreHttpClient } from '@nubitio/core';

function clientReturning(body: unknown, headers: Record<string, string> = {}): CoreHttpClient {
  return {
    get: async () => ({
      data: body,
      status: 200,
      headers: new Headers(headers),
      response: {} as Response,
    }),
  } as unknown as CoreHttpClient;
}

const source = (client: CoreHttpClient) =>
  new HydraRemoteDataSource({ url: '/api/ledger_entries', idField: 'id', httpClient: client });

const members = (count: number) => Array.from({ length: count }, (_, i) => ({ id: i + 1 }));

describe('reading a collection that gave up its exact count', () => {
  /**
   * The failure this replaces: without an exact total, `member.length` claims
   * the page is the whole table — a grid reporting "10 rows" for three years of
   * movements.
   */
  it('does not mistake the page for the table', async () => {
    const store = source(
      clientReturning(
        {
          'hydra:member': members(10),
          'hydra:view': { 'hydra:next': '/api/ledger_entries?id[lt]=90' },
        },
        { 'x-estimated-count': '2400000' },
      ),
    );

    const result = await store.load({});

    expect(result.totalCount).toBe(2400000);
    expect(result.totalIsEstimate).toBe(true);
  });

  it('flags the count as an estimate even when the server sent none', async () => {
    const store = source(clientReturning({ 'hydra:member': members(10) }));

    const result = await store.load({});

    expect(result.totalIsEstimate).toBe(true);
    expect(result.totalCount).toBe(10);
  });

  it('keeps an exact total exact', async () => {
    const store = source(clientReturning({ 'hydra:member': members(10), 'hydra:totalItems': 42 }));

    const result = await store.load({});

    expect(result.totalCount).toBe(42);
    expect(result.totalIsEstimate).toBe(false);
  });

  /** An exact total the server sent outranks an estimate it also sent. */
  it('prefers the exact total over the estimate', async () => {
    const store = source(
      clientReturning(
        { 'hydra:member': members(10), 'hydra:totalItems': 42 },
        { 'x-estimated-count': '9999' },
      ),
    );

    expect((await store.load({})).totalCount).toBe(42);
  });

  it('carries the server-produced next link', async () => {
    const store = source(
      clientReturning({
        'hydra:member': members(10),
        'hydra:view': { 'hydra:next': '/api/ledger_entries?id[lt]=90' },
      }),
    );

    expect((await store.load({})).nextPageUrl).toBe('/api/ledger_entries?id[lt]=90');
  });

  it('reports no next link on the last page', async () => {
    const store = source(clientReturning({ 'hydra:member': members(3), 'hydra:view': {} }));

    expect((await store.load({})).nextPageUrl).toBeNull();
  });

  it('reads the unprefixed shape too', async () => {
    const store = source(
      clientReturning({ member: members(2), view: { next: '/api/ledger_entries?id[lt]=8' } }),
    );

    const result = await store.load({});

    expect(result.data).toHaveLength(2);
    expect(result.nextPageUrl).toBe('/api/ledger_entries?id[lt]=8');
  });
});
