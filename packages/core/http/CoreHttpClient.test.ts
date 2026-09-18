import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCoreHttpClient } from './CoreHttpClient';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
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
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/merge-patch+json',
    );
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
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      refreshPath: 'auth/refresh',
      loginPath: 'auth/login',
    });
    await expect(client.get('items')).rejects.toMatchObject({
      message: 'Validation failed',
      status: 400,
    });
  });

  it('falls back to message field when detail is absent', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(422, { message: 'Unprocessable entity' }));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      refreshPath: 'auth/refresh',
      loginPath: 'auth/login',
    });
    await expect(client.get('items')).rejects.toMatchObject({
      message: 'Unprocessable entity',
    });
  });

  it('calls onError callback on non-401 errors', async () => {
    const onError = vi.fn();
    fetchMock.mockResolvedValueOnce(makeResponse(500, { detail: 'Server error' }));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      onError,
      refreshPath: 'auth/refresh',
      loginPath: 'auth/login',
    });
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

// ── dynamic auth headers ────────────────────────────────────────────────────────

describe('getAuthHeaders', () => {
  it('adds headers returned synchronously to every request', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      getAuthHeaders: () => ({ Authorization: 'Bearer token-123' }),
    });
    await client.get('items');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
  });

  it('awaits headers returned asynchronously', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      getAuthHeaders: async () => {
        await Promise.resolve();
        return { Authorization: 'Bearer async-token' };
      },
    });
    await client.get('items');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer async-token');
  });

  it('reads a fresh token on every call rather than caching the first one', async () => {
    let token = 'token-1';
    fetchMock.mockImplementation(() => Promise.resolve(makeResponse(200, {})));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      getAuthHeaders: () => ({ Authorization: token }),
    });
    await client.get('items');
    token = 'token-2';
    await client.get('items');
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: 'token-1',
    });
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toMatchObject({
      Authorization: 'token-2',
    });
  });

  it('adds no headers when omitted, preserving cookie-only behavior', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    await client.get('items');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('is also applied to the built-in refresh request', async () => {
    fetchMock
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200))
      .mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      refreshPath: 'auth/refresh',
      loginPath: 'auth/login',
      getAuthHeaders: () => ({ Authorization: 'Bearer stale-token' }),
    });
    await client.get('items/1');
    const refreshCall = fetchMock.mock.calls.find((c) => (c[0] as string).includes('auth/refresh'));
    expect((refreshCall![1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer stale-token',
    });
  });
});

// ── CSRF ─────────────────────────────────────────────────────────────────────

describe('getCsrfToken', () => {
  it('adds the token under the default header name for POST', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, {}));
    const client = createCoreHttpClient({ baseUrl: '/api/', getCsrfToken: () => 'csrf-abc' });
    await client.post('items', { name: 'New' });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-abc');
  });

  it('is consulted for PUT, PATCH and DELETE', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(makeResponse(200, {})));
    const getCsrfToken = vi.fn(() => 'csrf-abc');
    const client = createCoreHttpClient({ baseUrl: '/api/', getCsrfToken });
    await client.put('items/1', {});
    await client.patch('items/1', {});
    await client.delete('items/1');
    expect(getCsrfToken).toHaveBeenCalledTimes(3);
    expect(getCsrfToken).toHaveBeenCalledWith('PUT');
    expect(getCsrfToken).toHaveBeenCalledWith('PATCH');
    expect(getCsrfToken).toHaveBeenCalledWith('DELETE');
  });

  it('is not consulted for GET', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const getCsrfToken = vi.fn(() => 'csrf-abc');
    const client = createCoreHttpClient({ baseUrl: '/api/', getCsrfToken });
    await client.get('items');
    expect(getCsrfToken).not.toHaveBeenCalled();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBeUndefined();
  });

  it('omits the header when the hook returns undefined', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, {}));
    const client = createCoreHttpClient({ baseUrl: '/api/', getCsrfToken: () => undefined });
    await client.post('items', {});
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBeUndefined();
  });

  it('honors a custom header name', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, {}));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      getCsrfToken: () => 'csrf-abc',
      csrfHeaderName: 'X-Custom-Csrf',
    });
    await client.post('items', {});
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Custom-Csrf']).toBe('csrf-abc');
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBeUndefined();
  });
});

// ── correlation id ─────────────────────────────────────────────────────────────

describe('correlation id', () => {
  it('adds no header by default', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({ baseUrl: '/api/' });
    const result = await client.get('items');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Request-Id']).toBeUndefined();
    expect(result.correlationId).toBeUndefined();
  });

  it('adds a generated id under X-Request-Id when enabled', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      enableCorrelationId: true,
      getCorrelationId: () => 'fixed-id',
    });
    const result = await client.get('items');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Request-Id']).toBe('fixed-id');
    expect(result.correlationId).toBe('fixed-id');
  });

  it('honors a custom header name', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      enableCorrelationId: true,
      correlationIdHeaderName: 'Traceparent',
      getCorrelationId: () => 'fixed-id',
    });
    await client.get('items');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Traceparent).toBe('fixed-id');
  });

  it('is omitted for absolute URLs to a different origin, even when enabled', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({
      baseUrl: 'https://api.example.com/api/',
      enableCorrelationId: true,
      getCorrelationId: () => 'fixed-id',
    });
    const result = await client.get('https://other.example.com/data');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Request-Id']).toBeUndefined();
    expect(result.correlationId).toBeUndefined();
  });

  it('is attached to a request that resolves against an absolute baseUrl', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({
      baseUrl: 'https://api.example.com/api/',
      enableCorrelationId: true,
      getCorrelationId: () => 'fixed-id',
    });
    const result = await client.get('items');
    expect(result.correlationId).toBe('fixed-id');
  });

  it('is attached to a thrown error', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(500, { detail: 'Server error' }));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      enableCorrelationId: true,
      getCorrelationId: () => 'fixed-id',
    });
    await expect(client.get('items')).rejects.toMatchObject({ correlationId: 'fixed-id' });
  });

  it('reuses the same id across a 401 → refresh → retry sequence', async () => {
    const ids = ['first-attempt-id', 'should-not-be-used'];
    fetchMock
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200))
      .mockResolvedValueOnce(makeResponse(200, { id: 1 }));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      refreshPath: 'auth/refresh',
      loginPath: 'auth/login',
      enableCorrelationId: true,
      getCorrelationId: () => ids.shift()!,
    });
    const result = await client.get<{ id: number }>('items/1');
    // First call (401) and retry both carried the id generated for the first attempt.
    const [firstCallInit, , retryCallInit] = fetchMock.mock.calls.map((c) => c[1] as RequestInit);
    expect((firstCallInit.headers as Record<string, string>)['X-Request-Id']).toBe(
      'first-attempt-id',
    );
    expect((retryCallInit.headers as Record<string, string>)['X-Request-Id']).toBe(
      'first-attempt-id',
    );
    expect(result.correlationId).toBe('first-attempt-id');
  });

  it('mints its own id for the refresh request rather than borrowing the triggering request(s) id', async () => {
    const ids = ['request-id', 'refresh-id'];
    fetchMock
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200))
      .mockResolvedValueOnce(makeResponse(200, {}));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      refreshPath: 'auth/refresh',
      loginPath: 'auth/login',
      enableCorrelationId: true,
      getCorrelationId: () => ids.shift()!,
    });
    await client.get('items/1');
    const refreshCall = fetchMock.mock.calls.find((c) => (c[0] as string).includes('auth/refresh'));
    expect((refreshCall![1] as RequestInit).headers).toMatchObject({
      'X-Request-Id': 'refresh-id',
    });
  });
});

// ── header precedence ────────────────────────────────────────────────────────────

describe('header precedence', () => {
  it('lets a per-call header override auth, CSRF and correlation headers', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, {}));
    const client = createCoreHttpClient({
      baseUrl: '/api/',
      getAuthHeaders: () => ({ Authorization: 'Bearer default' }),
      getCsrfToken: () => 'default-csrf',
      enableCorrelationId: true,
      getCorrelationId: () => 'default-id',
    });
    await client.post('items', {}, { headers: { Authorization: 'Bearer override' } });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer override');
    expect(headers['X-CSRF-Token']).toBe('default-csrf');
    expect(headers['X-Request-Id']).toBe('default-id');
  });
});
