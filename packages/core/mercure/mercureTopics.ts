import { getCoreApiBaseUrl } from '../config/CoreConfig';
import { getDiscoveredMercureTopicOrigin } from './mercureDiscovery';

/**
 * Resolves the origin used to build Mercure collection topic URIs.
 *
 * API Platform publishes item updates to IRIs such as
 * `http://localhost:8000/api/products/42`. The SPA may run on another origin
 * in dev (Vite on :5173, API on :8000). The origin is normally autodiscovered
 * from absolute Hydra `@id` values on API responses. Set `mercureTopicOrigin`
 * on CoreConfig only when autodiscovery cannot infer the correct origin.
 */
export function resolveMercureTopicOrigin(
  apiBaseUrl: string = getCoreApiBaseUrl(),
  configuredOrigin?: string,
  discoveredOrigin: string | undefined = getDiscoveredMercureTopicOrigin(),
): string {
  const explicit = configuredOrigin?.trim().replace(/\/+$/, '');
  if (explicit) {
    return explicit;
  }

  const discovered = discoveredOrigin?.trim().replace(/\/+$/, '');
  if (discovered) {
    return discovered;
  }

  const trimmedBase = apiBaseUrl.trim();
  if (/^https?:\/\//i.test(trimmedBase)) {
    try {
      return new URL(trimmedBase).origin;
    } catch {
      // Fall through to browser origin.
    }
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
}

/**
 * Wildcard collection topic (RFC 6570 URI Template) for a resource API path.
 * e.g. `/api/products` → `http://localhost:8000/api/products/{id}`
 */
export function buildMercureCollectionTopic(
  apiUrl: string,
  configuredOrigin?: string,
  apiBaseUrl: string = getCoreApiBaseUrl(),
): string | null {
  if (!apiUrl) {
    return null;
  }

  const origin = resolveMercureTopicOrigin(apiBaseUrl, configuredOrigin);
  if (!origin) {
    return null;
  }

  const normalizedPath = apiUrl.replace(/^\//, '').replace(/\/+$/, '');
  if (!normalizedPath) {
    return null;
  }

  return `${origin}/${normalizedPath}/{id}`;
}