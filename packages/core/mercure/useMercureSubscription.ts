/**
 * useMercureSubscription — Hook that subscribes to a Mercure topic and calls
 * a callback whenever an SSE message is received for that topic.
 *
 * ## Behaviour
 * - If `hubUrl` is null (Mercure not configured) or `enabled` is false → no-op.
 * - Subscribes to the wildcard topic `<origin>/<apiUrl>/{id}` (URI Template RFC 6570),
 *   which captures any item-level event (create / update / delete) for the collection.
 * - Cleanup: unsubscribes on unmount or when dependencies change (no memory leaks).
 *
 * ## Usage
 *
 * ```tsx
 * useMercureSubscription(
 *   resource.apiUrl,
 *   () => { gridRef.current?.instance().refresh(); },
 *   resource.mercure !== false,
 * );
 * ```
 *
 * @param apiUrl   The resource API URL (e.g. `'api/products'` or `'/api/products'`).
 *                 Used to build the wildcard topic URI.
 * @param onUpdate Callback invoked on every SSE message for the topic.
 * @param enabled  When false, the subscription is skipped entirely. Defaults to true.
 */

import { useEffect } from 'react';
import { useMercureHub } from './useMercureHub';
import MercureManager from './MercureManager';

export function useMercureSubscription(
  apiUrl: string | undefined,
  onUpdate: () => void,
  enabled = true,
): void {
  const hubUrl = useMercureHub();

  useEffect(() => {
    // Graceful degradation: skip if hub not discovered, disabled, or no URL.
    if (!hubUrl || !enabled || !apiUrl) {
      return;
    }

    // Build the wildcard topic URI Template (RFC 6570):
    // e.g. apiUrl = 'api/products' → topic = 'https://host/api/products/{id}'
    const normalizedPath = apiUrl.replace(/^\//, '');
    const topic = `${window.location.origin}/${normalizedPath}/{id}`;

    // Wrap onUpdate so MercureManager receives a (data: unknown) => void signature.
    // We ignore the SSE payload — the grid always does a full refresh.
    const handler = (_data: unknown): void => {
      onUpdate();
    };

    MercureManager.subscribe(topic, handler);

    return () => {
      MercureManager.unsubscribe(topic, handler);
    };
    // onUpdate is intentionally excluded from deps: callers should pass a stable
    // callback (e.g. wrapped in useCallback). Including it would cause re-subscriptions
    // on every render if the caller forgets to memoize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubUrl, enabled, apiUrl]);
}
