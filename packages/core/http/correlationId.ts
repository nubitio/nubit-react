/**
 * Generates a client-side correlation id for one logical HTTP request.
 *
 * Prefers the standard `crypto.randomUUID()`. Falls back to a timestamp +
 * random token in environments where it is unavailable (insecure/non-HTTPS
 * contexts, older browsers, some test runners) so requests are never blocked
 * just because a correlation id could not be minted.
 *
 * Used by {@link CoreHttpClient} when `enableCorrelationId` is on. Exported
 * so an app can pre-generate an id for a request it hasn't sent yet — for
 * example an offline-queued mutation — and pass it back in via
 * `CoreHttpClientConfig.getCorrelationId` (or `CoreRequestConfig.headers`)
 * so the id logged in the offline queue matches the one the backend sees.
 */
export function generateCorrelationId(): string {
  const cryptoRef: Crypto | undefined =
    typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
