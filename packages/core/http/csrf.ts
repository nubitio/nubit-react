/** Name of the cookie the Nubit backend sets for the double-submit CSRF policy. */
export const CSRF_COOKIE_NAME = 'CSRF_TOKEN';

/**
 * Reads the double-submit CSRF token from `document.cookie`.
 *
 * The backend sets the cookie readable by JavaScript on purpose: a cross-site
 * page can make the browser attach it but cannot read it, so it cannot echo it
 * back in the `X-CSRF-Token` header. Returns `undefined` outside a browser or
 * before login has issued the cookie.
 */
export function readCsrfToken(cookieName: string = CSRF_COOKIE_NAME): string | undefined {
  if (typeof document === 'undefined') return undefined;

  for (const part of document.cookie.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== cookieName) continue;

    const value = part.slice(separator + 1).trim();
    if (value === '') return undefined;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}
