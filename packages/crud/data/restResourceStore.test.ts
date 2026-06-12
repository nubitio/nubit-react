import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRestResourceStore } from './restResourceStore';

function stubFetch(handler: (url: string) => { status?: number; body?: unknown; headers?: Record<string, string> }) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(url);
    const { status = 200, body = [], headers = {} } = handler(url);
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(headers),
      json: async () => body,
    };
  });
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('createRestResourceStore', () => {
  it('translates take/skip/sort/search into the default dialect params', async () => {
    const calls = stubFetch(() => ({ body: [] }));
    const store = createRestResourceStore()({ url: '/api/things', idField: 'id' });

    await store.load({ take: 20, skip: 40, sort: [{ selector: 'name', desc: true }], searchValue: 'foo' });

    const url = new URL(calls[0], 'http://test');
    expect(url.searchParams.get('page')).toBe('3');
    expect(url.searchParams.get('pageSize')).toBe('20');
    expect(url.searchParams.get('sort')).toBe('-name');
    expect(url.searchParams.get('q')).toBe('foo');
  });

  it('reads totals from arrays, X-Total-Count and enveloped bodies', async () => {
    const factory = createRestResourceStore();

    stubFetch(() => ({ body: [{ id: 1 }, { id: 2 }] }));
    expect((await factory({ url: '/a', idField: 'id' }).load({})).totalCount).toBe(2);

    stubFetch(() => ({ body: [{ id: 1 }], headers: { 'x-total-count': '57' } }));
    expect((await factory({ url: '/a', idField: 'id' }).load({})).totalCount).toBe(57);

    stubFetch(() => ({ body: { items: [{ id: 1 }], total: 9 } }));
    const enveloped = await factory({ url: '/a', idField: 'id' }).load({});
    expect(enveloped.totalCount).toBe(9);
    expect(enveloped.data).toEqual([{ id: 1 }]);
  });

  it('renames and disables params through the dialect', async () => {
    const calls = stubFetch(() => ({ body: [] }));
    const store = createRestResourceStore({
      pageParam: '_page',
      pageSizeParam: '_limit',
      sortParam: null,
      searchParam: null,
    })({ url: '/api/things', idField: 'id' });

    await store.load({ take: 10, skip: 0, sort: [{ selector: 'name' }], searchValue: 'x' });

    const url = new URL(calls[0], 'http://test');
    expect(url.searchParams.get('_page')).toBe('1');
    expect(url.searchParams.get('_limit')).toBe('10');
    expect(url.searchParams.get('sort')).toBeNull();
    expect(url.searchParams.get('q')).toBeNull();
  });

  it('resolves byKey against {url}/{key} and returns null on 404', async () => {
    stubFetch((url) => (url.endsWith('/things/7') ? { body: { id: 7 } } : { status: 404 }));
    const store = createRestResourceStore()({ url: '/things', idField: 'id' });

    expect(await store.byKey?.(7)).toEqual({ id: 7 });
    expect(await store.byKey?.(99)).toBeNull();
  });

  it('honors the byKeyUrl template', async () => {
    const calls = stubFetch(() => ({ body: { id: 5 } }));
    const store = createRestResourceStore()({
      url: '/things',
      byKeyUrl: '/things/detail/{id}',
      idField: 'id',
    });

    await store.byKey?.(5);

    expect(calls[0]).toBe('/things/detail/5');
  });
});
