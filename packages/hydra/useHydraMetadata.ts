import { useQuery } from '@tanstack/react-query';
import { useCoreHttpClient, type CoreHttpClient } from '@nubitio/core';
import { useCoreConfig } from '@nubitio/core';
import { parseHydraDoc, parseOpenApiDoc } from './openApiParser';
import type { HydraApiDoc, HydraEntrypointHrefs, OpenApiDoc, ApiDoc } from './types';

const JSONLD_URL = '/api/docs.jsonld';
const JSON_URL = '/api/docs.json';
const ENTRYPOINT_URL = '/api';
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

/**
 * Try to fetch and validate a Hydra JSON-LD doc.
 * Returns the typed HydraApiDoc on success, or throws on failure.
 */
async function fetchHydraDoc(httpClient: CoreHttpClient, url: string): Promise<HydraApiDoc> {
  const { data: json } = await httpClient.get<HydraApiDoc>(url);
  // Validate that it looks like a Hydra ApiDocumentation
  const jsonType = json['@type'] as string;
  if (
    (jsonType !== 'ApiDocumentation' && jsonType !== 'hydra:ApiDocumentation') ||
    !Array.isArray(json['supportedClass'])
  ) {
    throw new Error('useHydraMetadata: response is not a valid Hydra ApiDocumentation');
  }
  return json;
}

/**
 * Try to fetch and validate an OpenAPI 3.1 doc.
 * Returns the typed OpenApiDoc on success, or throws on failure.
 */
async function fetchOpenApiDoc(httpClient: CoreHttpClient, url: string): Promise<OpenApiDoc> {
  const { data: json } = await httpClient.get<OpenApiDoc>(url);
  // Validate that it looks like an OpenAPI 3.x doc
  if (typeof json.openapi !== 'string' || !json.openapi.startsWith('3')) {
    throw new Error('useHydraMetadata: response is not a valid OpenAPI 3.x doc');
  }
  return json;
}

/**
 * Fetch the API entrypoint (`GET /api`) and extract its property → collection
 * href map: `{ "salesDocument": "/api/sales-documents", … }`.
 *
 * This is the canonical source for resource URLs — it reflects the backend's
 * actual route generator instead of guessing via dash-case + pluralize.
 * Returns `undefined` on any failure (auth-gated entrypoint, network error,
 * unexpected shape) so the caller can fall back to the heuristic; URL
 * discovery must never take the whole admin down.
 */
async function fetchEntrypointHrefs(
  httpClient: CoreHttpClient,
): Promise<HydraEntrypointHrefs | undefined> {
  try {
    const { data } = await httpClient.get<Record<string, unknown>>(ENTRYPOINT_URL);
    if (!data || typeof data !== 'object') return undefined;
    const hrefs: HydraEntrypointHrefs = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('@')) continue; // JSON-LD keywords (@context, @id, @type)
      if (typeof value === 'string' && value.startsWith('/')) hrefs[key] = value;
    }
    return Object.keys(hrefs).length > 0 ? hrefs : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Stable query key used by useHydraMetadata.
 * Export this so that consumers (e.g. SmartCrudPage retry button) can
 * invalidate exactly the right query without coupling to an internal string.
 */
export const API_DOC_QUERY_KEY = ['api-doc-discovery'] as const;

/**
 * Waterfall discovery:
 *   1. Try /api/docs.jsonld (prefer Hydra — richer type info)
 *   2. Fall back to /api/docs.json (OpenAPI 3.1)
 *   3. Throw an Error if both fail so React Query sets isError = true
 */
async function fetchApiDoc(httpClient: CoreHttpClient): Promise<ApiDoc> {
  // 1. Try Hydra JSON-LD first. The entrypoint hrefs are fetched in parallel:
  //    they provide the real collection URLs (see fetchEntrypointHrefs).
  try {
    const [doc, entrypointHrefs] = await Promise.all([
      fetchHydraDoc(httpClient, JSONLD_URL),
      fetchEntrypointHrefs(httpClient),
    ]);
    return { format: 'hydra', doc, entrypointHrefs };
  } catch {
    // fall through to OpenAPI
  }

  // 2. Fall back to OpenAPI JSON
  try {
    const doc = await fetchOpenApiDoc(httpClient, JSON_URL);
    return { format: 'openapi', doc };
  } catch {
    // both failed — fall through to throw
  }

  // Both endpoints failed: throw so React Query sets isError = true
  throw new Error(
    `Failed to load API documentation from ${JSONLD_URL} and ${JSON_URL}. ` +
      'Make sure the API server is running.',
  );
}

export interface UseHydraMetadataResult {
  data: ApiDoc | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

export function useHydraMetadata(): UseHydraMetadataResult {
  const httpClient = useCoreHttpClient();
  const { locale } = useCoreConfig();
  const { data, error, isPending } = useQuery<ApiDoc, Error>({
    queryKey: [...API_DOC_QUERY_KEY, locale],
    queryFn: () => fetchApiDoc(httpClient),
    staleTime: isDev ? 0 : 5 * 60_000, // 0 in dev, 5 min in prod
    refetchOnWindowFocus: isDev,
    refetchOnReconnect: isDev,
  });

  return { data, isLoading: isPending, error: error ?? undefined };
}

export { parseHydraDoc, parseOpenApiDoc };
