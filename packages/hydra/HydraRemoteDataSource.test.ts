import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CoreHttpClient } from '@nubitio/core';
import { HydraRemoteDataSource } from './HydraRemoteDataSource';

const makeSource = (overrides = {}) =>
  new HydraRemoteDataSource({
    url: '/api/products',
    idField: 'id',
    ...overrides,
  });

type ProtocolFixtures = {
  loadOptionCases: Array<{
    name: string;
    input: Record<string, unknown>;
    expected: Record<string, unknown>;
    absent?: string[];
  }>;
  responseCases: Array<{
    name: string;
    body: unknown;
    headers: Record<string, string>;
    expected: { totalCount: number; gridSummary: Record<string, unknown> | null };
  }>;
};

const protocolFixtures = JSON.parse(
  readFileSync(join(process.cwd(), 'contracts/x-grid-protocol.fixtures.json'), 'utf8'),
) as ProtocolFixtures;

// ── prepareLoadOptions ────────────────────────────────────────────────────────

describe('HydraRemoteDataSource.prepareLoadOptions', () => {
  protocolFixtures.loadOptionCases.forEach((fixture) => {
    it(`satisfies protocol fixture: ${fixture.name}`, () => {
      const result = makeSource().prepareLoadOptions(fixture.input);
      expect(result).toMatchObject(fixture.expected);
      fixture.absent?.forEach((key) => expect(result).not.toHaveProperty(key));
    });
  });

  it('passes through load options unchanged when no defaults are set', () => {
    const ds = makeSource();
    const result = ds.prepareLoadOptions({ filter: [], sort: [] });
    expect(result.filter).toEqual([]);
    expect(result.sort).toEqual([]);
  });

  it('strips searchOperation from load options', () => {
    const ds = makeSource();
    const result = ds.prepareLoadOptions({ searchOperation: 'contains' });
    expect(result.searchOperation).toBeUndefined();
  });

  it('strips searchValue when searchExpr is missing', () => {
    const ds = makeSource();
    const result = ds.prepareLoadOptions({ searchValue: 'test' });
    expect(result.searchValue).toBeUndefined();
  });

  it('keeps searchValue when searchExpr is present', () => {
    const ds = makeSource();
    const result = ds.prepareLoadOptions({ searchExpr: 'name', searchValue: 'test' });
    expect(result.searchValue).toBe('test');
    expect(result.searchExpr).toBe('name');
  });

  it('inlines a single three-element filter tuple into nested filter array', () => {
    const ds = makeSource();
    const result = ds.prepareLoadOptions({ filter: ['name', '=', 'laptop'] });
    expect(result.filter).toEqual([['name', '=', 'laptop']]);
  });

  it('prepends defaultFilterRules before user filters', () => {
    const ds = makeSource({
      defaultFilterRules: [['active', '=', true]],
    });
    const result = ds.prepareLoadOptions({ filter: ['name', '=', 'test'] });
    expect(result.filter).toEqual([
      ['active', '=', true],
      ['name', '=', 'test'],
    ]);
  });

  it('coerces FilterRule objects into tuple filters for query serialization', () => {
    const ds = makeSource({
      defaultFilterRules: [{ field: 'product', operator: '=', value: '/api/products/p1' }],
    });
    const result = ds.prepareLoadOptions({ filter: [] });
    expect(result.filter).toEqual([['product', '=', '/api/products/p1']]);
  });

  it('skips the default id-only sort when no defaultSortRules are set', () => {
    const ds = makeSource();
    const result = ds.prepareLoadOptions({ sort: [{ selector: 'id', desc: false }] });
    expect(result.sort).toEqual([]);
  });

  it('applies defaultSortRules when the only sort is by idField', () => {
    const ds = makeSource({ defaultSortRules: [{ selector: 'name', desc: false }] });
    const result = ds.prepareLoadOptions({ sort: [{ selector: 'id', desc: false }] });
    expect(result.sort).toEqual([{ selector: 'name', desc: false }]);
  });
});

// ── makeFilterRules ───────────────────────────────────────────────────────────

describe('HydraRemoteDataSource.makeFilterRules', () => {
  it('serializes filter rules to query string format', () => {
    const ds = makeSource();
    const result = ds.makeFilterRules([{ field: 'name', operator: 'contains', value: 'laptop' }]);
    expect(result).toBe('filter[]=["name","contains","laptop"]');
  });

  it('joins multiple filter rules with &', () => {
    const ds = makeSource();
    const result = ds.makeFilterRules([
      { field: 'active', operator: '=', value: 'true' },
      { field: 'name', operator: 'startswith', value: 'A' },
    ]);
    expect(result).toBe('filter[]=["active","=","true"]&filter[]=["name","startswith","A"]');
  });

  it('returns empty string for an empty rule list', () => {
    const ds = makeSource();
    expect(ds.makeFilterRules([])).toBe('');
  });
});

// ── load ──────────────────────────────────────────────────────────────────────

describe('HydraRemoteDataSource.load', () => {
  protocolFixtures.responseCases.forEach((fixture) => {
    it(`satisfies protocol fixture: ${fixture.name}`, async () => {
      const httpClient = {
        get: async () => ({ data: fixture.body, headers: new Headers(fixture.headers) }),
      } as unknown as CoreHttpClient;

      const result = await makeSource({ httpClient }).load({});

      expect(result.totalCount).toBe(fixture.expected.totalCount);
      expect(result.gridSummary).toEqual(fixture.expected.gridSummary);
    });
  });

  it('reads array responses with x-total-count headers', async () => {
    const httpClient = {
      get: async () => ({
        data: [{ id: 1 }, { id: 2 }],
        headers: new Headers({ 'x-total-count': '10' }),
      }),
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    const result = await ds.load({});

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.totalCount).toBe(10);
  });

  it('reads Hydra JSON-LD collection responses', async () => {
    const httpClient = {
      get: async () => ({
        data: {
          'hydra:member': [{ '@id': '/api/products/1', name: 'Laptop' }],
          'hydra:totalItems': 7,
        },
        headers: new Headers(),
      }),
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    const result = await ds.load({});

    expect(result.data).toEqual([{ '@id': '/api/products/1', name: 'Laptop' }]);
    expect(result.totalCount).toBe(7);
  });

  it('reads compact collection responses', async () => {
    const httpClient = {
      get: async () => ({
        data: {
          member: [{ id: 1, name: 'Laptop' }],
          totalItems: 3,
        },
        headers: new Headers(),
      }),
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    const result = await ds.load({});

    expect(result.data).toEqual([{ id: 1, name: 'Laptop' }]);
    expect(result.totalCount).toBe(3);
  });

  // prependData/appendData keep the currently-selected option visible in an
  // entity dropdown even when the default query would otherwise exclude it
  // (e.g. it's already assigned elsewhere and the list only shows
  // "available" items). When the query's own filters aren't active yet —
  // opening the dropdown with a blank search — that same record often comes
  // back from the API too, so without deduping it renders twice with an
  // identical key.
  it('drops a prepended item already present in the fetched page', async () => {
    const httpClient = {
      get: async () => ({
        data: [
          { id: 1, name: 'OC-000001' },
          { id: 2, name: 'OC-000002' },
        ],
        headers: new Headers(),
      }),
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    const result = await ds.load({ prependData: [{ id: 1, name: 'OC-000001' }] });

    expect(result.data).toEqual([
      { id: 1, name: 'OC-000001' },
      { id: 2, name: 'OC-000002' },
    ]);
  });

  it('keeps a prepended item that is not in the fetched page', async () => {
    const httpClient = {
      get: async () => ({
        data: [{ id: 2, name: 'OC-000002' }],
        headers: new Headers(),
      }),
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    const result = await ds.load({ prependData: [{ id: 1, name: 'OC-000001' }] });

    expect(result.data).toEqual([
      { id: 1, name: 'OC-000001' },
      { id: 2, name: 'OC-000002' },
    ]);
  });

  it('drops an appended item already present in the fetched page', async () => {
    const httpClient = {
      get: async () => ({
        data: [{ id: 1, name: 'OC-000001' }],
        headers: new Headers(),
      }),
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    const result = await ds.load({ appendData: [{ id: 1, name: 'OC-000001' }] });

    expect(result.data).toEqual([{ id: 1, name: 'OC-000001' }]);
  });

  it('matches prependData/appendData by @id when idField is absent (iriMode)', async () => {
    const httpClient = {
      get: async () => ({
        data: [{ '@id': '/api/orden_compras/1', name: 'OC-000001' }],
        headers: new Headers(),
      }),
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    const result = await ds.load({
      prependData: [{ '@id': '/api/orden_compras/1', name: 'OC-000001' }],
    });

    expect(result.data).toEqual([{ '@id': '/api/orden_compras/1', name: 'OC-000001' }]);
  });

  // Real-world shape (plain REST JSON, no JSON-LD): idField is `_iri`
  // (iriMode) but raw items off the wire have neither `_iri` nor `@id` —
  // only `id`. The prepended item is the currently-selected entity dropdown
  // value, already normalized through a prior byKey()/addIriField() pass,
  // so it *does* carry `_iri` already. Keying off idField/@id first would
  // compare `undefined` (raw item) against `/api/orden_compras/1`
  // (prepended item) and never match — this is the exact bug this dedup
  // exists to fix, on an entity dropdown with an active selection.
  it('dedupes a pre-normalized prependData item against a raw fetched item sharing only `id`', async () => {
    const httpClient = {
      get: async () => ({
        data: [
          { id: 1, numero: 'OC-000001' },
          { id: 2, numero: 'OC-000002' },
        ],
        headers: new Headers(),
      }),
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient, idField: '_iri', iriMode: true });

    const result = await ds.load({
      prependData: [{ id: 1, numero: 'OC-000001', _iri: '/api/orden_compras/1' }],
    });

    expect(result.data).toHaveLength(2);
    expect(result.data.filter((item) => item['id'] === 1)).toHaveLength(1);
  });

  it('does not forward prependData/appendData as request query params', async () => {
    let capturedParams: Record<string, unknown> | undefined;
    const httpClient = {
      get: async (_url: string, config?: { params?: Record<string, unknown> }) => {
        capturedParams = config?.params;
        return { data: [{ id: 1, name: 'OC-000001' }], headers: new Headers() };
      },
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    await ds.load({
      prependData: [{ id: 2, name: 'OC-000002' }],
      appendData: [{ id: 3, name: 'OC-000003' }],
    });

    expect(capturedParams).not.toHaveProperty('prependData');
    expect(capturedParams).not.toHaveProperty('appendData');
  });
});

// ── export ────────────────────────────────────────────────────────────────────

describe('HydraRemoteDataSource.export', () => {
  it('requests the xlsx format as a blob and returns it with the server filename', async () => {
    const blob = new Blob(['fake xlsx bytes']);
    const httpClient = {
      get: async () => ({
        data: blob,
        headers: new Headers({ 'content-disposition': 'attachment; filename="products-2026-08-20.xlsx"' }),
      }),
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    const result = await ds.export({});

    expect(result.blob).toBe(blob);
    expect(result.filename).toBe('products-2026-08-20.xlsx');
  });

  it('falls back to a generic filename when Content-Disposition is missing', async () => {
    const httpClient = {
      get: async () => ({ data: new Blob([]), headers: new Headers() }),
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    const result = await ds.export({});

    expect(result.filename).toBe('export.xlsx');
  });

  it('requests the blob response type with the xlsx Accept header', async () => {
    let capturedConfig: { responseType?: string; headers?: Record<string, string> } | undefined;
    const httpClient = {
      get: async (_url: string, config?: typeof capturedConfig) => {
        capturedConfig = config;
        return { data: new Blob([]), headers: new Headers() };
      },
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    await ds.export({});

    expect(capturedConfig?.responseType).toBe('blob');
    expect(capturedConfig?.headers?.Accept).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('drops pagination so the export covers every filtered row, not one page', async () => {
    let capturedParams: Record<string, unknown> | undefined;
    const httpClient = {
      get: async (_url: string, config?: { params?: Record<string, unknown> }) => {
        capturedParams = config?.params;
        return { data: new Blob([]), headers: new Headers() };
      },
    } as unknown as CoreHttpClient;
    const ds = makeSource({ httpClient });

    await ds.export({ skip: 20, take: 10 });

    expect(capturedParams).not.toHaveProperty('page');
    expect(capturedParams).not.toHaveProperty('itemsPerPage');
  });

  it.each([
    ["attachment; filename*=UTF-8''pedidos%20a%C3%B1o.xlsx", 'pedidos año.xlsx'],
    ['attachment; filename=plain.xlsx', 'plain.xlsx'],
    ['attachment; filename="quoted; tricky.xlsx"', 'quoted; tricky.xlsx'],
    // A server-chosen name must not be able to steer the download elsewhere.
    ['attachment; filename="../../evil.xlsx"', '.._.._evil.xlsx'],
    ['attachment', 'export.xlsx'],
  ])('reads the filename out of %j', async (disposition, expected) => {
    const httpClient = {
      get: async () => ({
        data: new Blob([]),
        headers: new Headers({ 'content-disposition': disposition }),
      }),
    } as unknown as CoreHttpClient;

    const result = await makeSource({ httpClient }).export({});

    expect(result.filename).toBe(expected);
  });
});
