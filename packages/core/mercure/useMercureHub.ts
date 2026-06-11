/**
 * useMercureHub — Hook that returns the Mercure hub URL from context.
 *
 * Returns `null` if:
 * - The component is rendered outside a `<MercureProvider>` (default context value).
 * - The hub URL has not been discovered yet (header `Link` not received).
 * - Mercure is not configured in the backend.
 *
 * This hook does NOT perform any fetch or side effect — it only reads from context.
 * Hub discovery (usually from a `Link` header) must be done by the host application.
 *
 * ## Usage
 *
 * ```tsx
 * const hubUrl = useMercureHub();
 * // hubUrl is string | null
 * ```
 */

import { useContext } from 'react';
import { MercureContext } from './MercureProvider';

/**
 * Returns the Mercure hub URL from the nearest `<MercureProvider>`,
 * or `null` if the hub is not available.
 */
export function useMercureHub(): string | null {
  return useContext(MercureContext);
}
