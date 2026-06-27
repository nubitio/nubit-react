import type { ResourceConfig } from './ResourceConfig';
import type { ResourceConfigGroups } from './ResourceConfigGroups';
import { flattenResourceGroups } from './ResourceConfigGroups';
import type { DataRecord } from '@nubitio/core';

const stringResourceCache = new Map<string, ResourceConfig>();

function cacheKey(apiUrl: string, overrides?: DataRecord): string | null {
  if (!overrides) return apiUrl;

  try {
    return `${apiUrl}::${JSON.stringify(overrides)}`;
  } catch {
    return null;
  }
}

/**
 * Derives the resource `id` from a URL string.
 * '/api/products'         → 'products'
 * '/api/voucher-series'   → 'voucher-series'
 * 'http://host/a/b/items' → 'items'
 */
function deriveId(apiUrl: string): string {
  const stripped = apiUrl.replace(/\/+$/, '');
  const last = stripped.split('/').pop() ?? stripped;
  return last.split('?')[0];
}

/** Zero config — `id` and `title` derived from the URL. */
export function defineResource(apiUrl: string): ResourceConfig;

/**
 * URL + partial overrides (canonical form).
 * Pass `mercure: false` to disable the real-time Mercure subscription.
 */
export function defineResource<T extends DataRecord>(
  apiUrl: string,
  overrides: Partial<Omit<ResourceConfig<T>, 'apiUrl'>> & { id?: string },
): ResourceConfig<T>;

export function defineResource<T extends DataRecord = DataRecord>(
  apiUrl: string,
  overrides?: Partial<Omit<ResourceConfig<T>, 'apiUrl'>> & { id?: string },
): ResourceConfig<T> {
  const key = cacheKey(apiUrl, overrides as DataRecord | undefined);
  if (key !== null && stringResourceCache.has(key)) {
    return stringResourceCache.get(key)! as ResourceConfig<T>;
  }

  const id = overrides?.id ?? deriveId(apiUrl);
  const resource = {
    id,
    title: '',
    ...overrides,
    apiUrl,
  } as ResourceConfig<T>;

  if (key !== null) {
    stringResourceCache.set(key, resource as ResourceConfig);
  }

  return resource;
}

/** Grouped config variant — same as defineResource but accepts nested display/access/form/grid. */
export function defineResourceGrouped<T extends DataRecord = DataRecord>(
  apiUrl: string,
  config: ResourceConfigGroups & Partial<Omit<ResourceConfig<T>, 'apiUrl'>> & { id?: string },
): ResourceConfig<T> {
  const { display, access, form, grid, routing, ...rest } = config;
  return defineResource(apiUrl, {
    ...flattenResourceGroups({ display, access, form, grid, routing }),
    ...rest,
  } as Partial<Omit<ResourceConfig<T>, 'apiUrl'>> & { id?: string });
}
