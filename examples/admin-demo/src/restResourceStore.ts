import type { ResourceStoreFactory } from '@nubitio/react-admin';

/**
 * Minimal REST ResourceStore for the demo: loads the full collection from a
 * plain-array endpoint (like JSONPlaceholder) and reports the array length as
 * the total count. A real backend would translate the grid's load options
 * (pagination, sort, filter) into query parameters here — this is the
 * extension point @nubitio/crud exposes for non-Hydra backends.
 */
export const restResourceStore: ResourceStoreFactory = ({ url }) => ({
  async load() {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GET ${url} → ${response.status}`);
    const body = (await response.json()) as Record<string, unknown>[] | { items: Record<string, unknown>[]; total?: number };
    const data = Array.isArray(body) ? body : body.items;
    const totalCount = Array.isArray(body) ? body.length : (body.total ?? data.length);
    return { data, totalCount, summary: null };
  },

  async byKey(key) {
    const response = await fetch(`${url.replace(/\/+$/, '')}/${String(key)}`);
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  },
});
