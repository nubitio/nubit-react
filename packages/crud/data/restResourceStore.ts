import type { DataRecord } from '@nubitio/core';
import type {
  ResourceFilterDescriptor,
  ResourceLoadOptions,
  ResourceLoadResult,
  ResourceSortDescriptor,
  ResourceStoreFactory,
} from './ResourceStore';

/**
 * Query-string dialect for plain REST backends. Every param can be renamed
 * or disabled (null) to match the API at hand; filters are opt-in because no
 * two REST APIs agree on a filter syntax.
 */
export interface RestQueryDialect {
  /** 1-based page number param. Default `page`; null omits pagination params. */
  pageParam?: string | null;
  /** Page size param. Default `pageSize`. */
  pageSizeParam?: string | null;
  /**
   * Sort param, comma-joined `field` / `-field` (leading minus = descending).
   * Default `sort`; null omits sorting params.
   */
  sortParam?: string | null;
  /** Full-text search param fed from the grid search box. Default `q`; null omits it. */
  searchParam?: string | null;
  /** Translate grid filter descriptors into query params. Filters are ignored without it. */
  serializeFilter?: (filter: ResourceFilterDescriptor) => Record<string, string>;
}

function sortExpression(sorts: ResourceSortDescriptor[]): string {
  return sorts
    .map((sort) => {
      if (typeof sort === 'string') return sort;
      const field = sort.selector ?? '';
      return sort.desc ? `-${field}` : field;
    })
    .filter((expr) => expr !== '' && expr !== '-')
    .join(',');
}

function appendQuery(url: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  if (query === '') return url;
  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}

/**
 * ResourceStore factory for plain (non-Hydra) REST backends — pass it to
 * `ResourceStoreProvider` and the grids work against array or
 * `{ items|data, total|totalCount }` responses. Totals fall back to the
 * `X-Total-Count` header and finally to the payload length, so endpoints
 * without server-side pagination (JSONPlaceholder-style) work out of the box.
 *
 *     <ResourceStoreProvider factory={createRestResourceStore()}>
 *
 * Pair it with `adapter: RestAdapter` on `defineResource` for entity refs.
 */
export function createRestResourceStore(dialect: RestQueryDialect = {}): ResourceStoreFactory {
  const {
    pageParam = 'page',
    pageSizeParam = 'pageSize',
    sortParam = 'sort',
    searchParam = 'q',
    serializeFilter,
  } = dialect;

  return ({ url, byKeyUrl, httpClient }) => {
    async function request<T>(target: string): Promise<{ data: T; headers: Headers } | null> {
      if (httpClient) {
        try {
          const response = await httpClient.get<T>(target);
          return { data: response.data, headers: response.headers };
        } catch {
          return null;
        }
      }

      const response = await fetch(target);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`GET ${target} → ${response.status}`);
      }
      return { data: (await response.json()) as T, headers: response.headers };
    }

    return {
      async load(options: ResourceLoadOptions): Promise<ResourceLoadResult> {
        const params: Record<string, string> = {};

        const take = typeof options.take === 'number' ? options.take : undefined;
        const skip = typeof options.skip === 'number' ? options.skip : undefined;
        if (pageParam != null && take !== undefined && take > 0) {
          params[pageParam] = String(Math.floor((skip ?? 0) / take) + 1);
          if (pageSizeParam != null) params[pageSizeParam] = String(take);
        }

        if (sortParam != null && Array.isArray(options.sort) && options.sort.length > 0) {
          const expr = sortExpression(options.sort);
          if (expr !== '') params[sortParam] = expr;
        }

        if (searchParam != null && typeof options.searchValue === 'string' && options.searchValue !== '') {
          params[searchParam] = options.searchValue;
        }

        if (serializeFilter && Array.isArray(options.filter) && options.filter.length > 0) {
          Object.assign(params, serializeFilter(options.filter));
        }

        const result = await request<
          DataRecord[] | { items?: DataRecord[]; data?: DataRecord[]; total?: number; totalCount?: number }
        >(appendQuery(url, params));
        if (result === null) return { data: [], totalCount: 0, summary: null, gridSummary: null };

        const body = result.data;
        const data = Array.isArray(body) ? body : (body.items ?? body.data ?? []);
        const headerTotal = Number(result.headers.get('x-total-count'));
        const totalCount = Array.isArray(body)
          ? (Number.isFinite(headerTotal) && headerTotal > 0 ? headerTotal : body.length)
          : (body.total ?? body.totalCount ?? data.length);

        const gridSummaryHeader = result.headers.get('x-grid-summary');
        let gridSummary: Record<string, unknown> | null = null;
        if (gridSummaryHeader) {
          try {
            const parsed = JSON.parse(gridSummaryHeader) as unknown;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              gridSummary = parsed as Record<string, unknown>;
            }
          } catch {
            gridSummary = null;
          }
        }

        return { data, totalCount, summary: null, gridSummary };
      },

      async byKey(key: unknown): Promise<DataRecord | null> {
        const target = byKeyUrl
          ? byKeyUrl.replace('{id}', String(key))
          : `${url.replace(/\/+$/, '')}/${String(key)}`;
        const result = await request<DataRecord>(target);
        return result?.data ?? null;
      },
    };
  };
}
