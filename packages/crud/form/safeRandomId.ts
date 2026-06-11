/**
 * Generate a unique-enough id string for internal React keys.
 *
 * Prefers the standards `crypto.randomUUID()` when available, but falls back to
 * a Math.random-based token so the engine never throws in environments where
 * `crypto.randomUUID` is undefined: insecure (non-HTTPS) browser contexts,
 * older browsers, server-side rendering, and some test runners.
 *
 * These ids are used only as stable list keys for detail-grid rows — they are
 * never persisted or sent to the backend — so the fallback's weaker uniqueness
 * guarantees are acceptable.
 */
export function safeRandomId(): string {
  const c: Crypto | undefined = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `rid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
