import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoreHttpClient, createCoreHttpClient } from './CoreHttpClient';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeResponse(status: number, body: unknown = {}, headers: Record<string, string> = {}): Response {
  const init: ResponseInit = {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  return new Response(status === 204 ? null : JSON.stringify(body), init);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── URL joining ───────────────────────────────────────────────────────────────

describe('URL joining', () => {
  it('joins relative path with base URL', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, { ok: true }));
    const client = createCoreHttpClient({ baseUrl: 'https://api.example.com/api/' });
    await client.get('products');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/products');
  });

  it('passes through absolute URLs unchanged', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: 'https://api.example.com/api/' });
    await client.get('https://other.example.com/data');
    expect(fetchMock.mock.calls[0][0]).toBe('https://other.example.com/data');
  });

  it('passes through root-relative URLs unchanged', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: 'https://api.example.com/api/' });
    await client.get('/absolute-path');
    expect(fetchMock.mock.calls[0][0]).toBe('/absolute-path');
  });

  it('avoids double slashes when base has trailing slash', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: 'https://example.com/api/' });
    await client.get('items');
    expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/api/items');
  });
});

// ── query param serialization ─────────────────────────────────────────────────

describe('query param serialization', () => {
  it('appends flat params as query string', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    await client.get('items', { params: { page: 1, name: 'foo' } });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('page=1');
    expect(url).toContain('name=foo');
  });

  it('serializes array params with index notation', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    await client.get('items', { params: { ids: [1, 2, 3] } });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('ids%5B0%5D=1');
    expect(url).toContain('ids%5B1%5D=2');
    expect(url).toContain('ids%5B2%5D=3');
  });

  it('serializes nested object params', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    await client.get('items', { params: { filter: { status: 'active' } } });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('filter%5Bstatus%5D=active');
  });

  it('skips null and undefined params', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    await client.get('items', { params: { a: null, b: undefined, c: 'keep' } });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain('a=');
    expect(url).not.toContain('b=');
    expect(url).toContain('c=keep');
  });

  it('appends to existing query string with &', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    await client.get('items?existing=1', { params: { extra: '2' } });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('existing=1&extra=2');
  });
});

// ── response handling ─────────────────────────────────────────────────────────

describe('response handling', () => {
  it('returns parsed JSON data on 200', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, { id: 1, name: 'Test' }));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    const result = await client.get<{ id: number; name: string }>('items/1');
    expect(result.data).toEqual({ id: 1, name: 'Test' });
    expect(result.status).toBe(200);
  });

  it('returns undefined data on 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(204));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    const result = await client.delete('items/1');
    expect(result.data).toBeUndefined();
    expect(result.status).toBe(204);
  });

  it('sends JSON body with Content-Type header on POST', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, { id: 2 }));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    await client.post('items', { name: 'New' });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'New' }));
  });

  it('uses application/merge-patch+json for PATCH', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    await client.patch('items/1', { name: 'Updated' });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/merge-patch+json');
  });

  it('does not set Content-Type for FormData body', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    await client.post('upload', new FormData());
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });
});

// ── error handling ────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('throws with error message from response detail field', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(400, { detail: 'Validation failed' }));
    const client = createCoreHttpClient({ baseUrl: '/api/', refreshPath: 'auth/refresh', loginPath: 'auth/login' });
    await expect(client.get('items')).rejects.toMatchObject({
      message: 'Validation failed',
      status: 400,
    });
  });

  it('falls back to message field when detail is absent', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(422, { message: 'Unprocessable entity' }));
    const client = createCoreHttpClient({ baseUrl: '/api/', refreshPath: 'auth/refresh', loginPath: 'auth/login' });
    await expect(client.get('items')).rejects.toMatchObject({
      message: 'Unprocessable entity',
    });
  });

  it('calls onError callback on non-401 errors', async () => {
    const onError = vi.fn();
    fetchMock.mockResolvedValueOnce(makeResponse(500, { detail: 'Server error' }));
    const client = createCoreHttpClient({ baseUrl: '/api/', onError, refreshPath: 'auth/refresh', loginPath: 'auth/login' });
    await expect(client.get('items')).rejects.toThrow();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('calls onUnauthorized and does not call onError on 401 after refresh fails', async () => {
    const onUnauthorized = vi.fn();
    const onError = vi.fn();
    fetchMock
      .mockResolvedValueOnce(makeResponse(401, { detail: 'Unauthorized' }))
      .mockResolvedValueOnce(makeResponse(401, { detail: 'Refresh failed' }));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      onUnauthorized,
      onError,
      refreshPath: 'auth/refresh',
      loginPath: 'auth/login',
    });
    await expect(client.get('items')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });
});

// ── refresh retry ─────────────────────────────────────────────────────────────

describe('refresh retry', () => {
  it('retries request after successful session refresh on 401', async () => {
    const data = { id: 1 };
    fetchMock
      .mockResolvedValueOnce(makeResponse(401, { detail: 'Unauthorized' }))
      .mockResolvedValueOnce(makeResponse(200))
      .mockResolvedValueOnce(makeResponse(200, data));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      refreshPath: 'auth/refresh',
      loginPath: 'auth/login',
    });
    const result = await client.get<{ id: number }>('items/1');
    expect(result.data).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 401 for auth endpoints', async () => {
    const onUnauthorized = vi.fn();
    fetchMock.mockResolvedValueOnce(makeResponse(401, { detail: 'Bad credentials' }));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      onUnauthorized,
      refreshPath: 'auth/refresh',
      loginPath: 'auth/login',
    });
    await expect(client.get('auth/login')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('deduplicates concurrent refresh calls into a single request', async () => {
    const data = { id: 1 };
    fetchMock
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200))
      .mockResolvedValueOnce(makeResponse(200, data))
      .mockResolvedValueOnce(makeResponse(200, data));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      refreshPath: 'auth/refresh',
      loginPath: 'auth/login',
    });
    const [r1, r2] = await Promise.all([
      client.get<{ id: number }>('items/1'),
      client.get<{ id: number }>('items/1'),
    ]);
    const refreshCalls = fetchMock.mock.calls.filter((c) =>
      (c[0] as string).includes('auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
    expect(r1.data).toEqual(data);
    expect(r2.data).toEqual(data);
  });
});
