import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { csrfFetch } from './csrfFetch';

const fetchMock = vi.fn(
  async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 }),
);

function sentHeaders(): Headers {
  const init = fetchMock.mock.calls[0]?.[1];
  return new Headers(init?.headers);
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'CSRF_TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

describe('csrfFetch', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('echoes the CSRF cookie on %s', async (method) => {
    document.cookie = 'CSRF_TOKEN=tok-1; path=/';

    await csrfFetch('/api/auth/logout', { method, credentials: 'include' });

    expect(sentHeaders().get('X-CSRF-Token')).toBe('tok-1');
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include');
  });

  it('keeps the caller headers and does not override an explicit token', async () => {
    document.cookie = 'CSRF_TOKEN=tok-1; path=/';

    await csrfFetch('/api/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'explicit' },
    });

    expect(sentHeaders().get('Content-Type')).toBe('application/json');
    expect(sentHeaders().get('X-CSRF-Token')).toBe('explicit');
  });

  it('leaves reads untouched', async () => {
    document.cookie = 'CSRF_TOKEN=tok-1; path=/';

    await csrfFetch('/api/me', { credentials: 'include' });

    expect(sentHeaders().has('X-CSRF-Token')).toBe(false);
  });

  it('passes the request through when no cookie has been issued yet', async () => {
    await csrfFetch('/api/auth/logout', { method: 'POST' });

    expect(sentHeaders().has('X-CSRF-Token')).toBe(false);
  });
});
