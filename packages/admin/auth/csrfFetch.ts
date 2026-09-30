import { DEFAULT_CSRF_HEADER_NAME, readCsrfToken } from '@nubitio/core';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * `fetch` that echoes the double-submit CSRF cookie as `X-CSRF-Token` on
 * state-changing requests.
 *
 * The backend rejects cookie-authenticated POST/PUT/PATCH/DELETE that lack it
 * (`nubit_admin.auth.csrf_protection`, on by default), so the auth pages' own
 * calls — logout, change password, TOTP, session revocation — need it exactly
 * as the CRUD client does. Reads, and requests made before login has issued the
 * cookie, pass through untouched.
 */
export function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const token = MUTATING_METHODS.has(method) ? readCsrfToken() : undefined;
  if (token === undefined) return fetch(input, init);

  const headers = new Headers(init.headers);
  if (!headers.has(DEFAULT_CSRF_HEADER_NAME)) headers.set(DEFAULT_CSRF_HEADER_NAME, token);
  return fetch(input, { ...init, headers });
}
