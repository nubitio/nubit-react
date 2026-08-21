import { createCoreHttpClient, type CoreHttpClient, type GridData } from '@nubitio/core';
import type { DataRecord } from '@nubitio/core';
import type {
  ResourceExportResult,
  ResourceFilterDescriptor,
  ResourceFilterRule,
  ResourceLoadOption,
  ResourceLoadOptions,
  ResourceSortDescriptor,
  ResourceStore,
  ResourceStoreFactory,
  ResourceStoreOptions,
} from '@nubitio/crud';

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// RFC 6266: `filename*=UTF-8''…` (percent-encoded, takes precedence when both
// forms are present) and the plain `filename="…"`. Matching a bare `filename`
// prefix would capture the `*=UTF-8''` form's encoding preamble as the name.
const CONTENT_DISPOSITION_FILENAME_EXT = /filename\*\s*=\s*[^']*'[^']*'([^;]+)/i;
const CONTENT_DISPOSITION_FILENAME = /filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i;

function parseContentDispositionFilename(headers: Headers, fallback: string): string {
  const raw = headers.get('content-disposition');
  if (!raw) return fallback;

  const extended = CONTENT_DISPOSITION_FILENAME_EXT.exec(raw)?.[1];
  if (extended) {
    try {
      return sanitizeFilename(decodeURIComponent(extended.trim())) ?? fallback;
    } catch {
      // Malformed percent-encoding — fall through to the plain form.
    }
  }

  const match = CONTENT_DISPOSITION_FILENAME.exec(raw);
  const plain = match?.[1] ?? match?.[2];
  return (plain && sanitizeFilename(plain.trim())) || fallback;
}

/** The server names the file; never let that name escape the download directory. */
function sanitizeFilename(value: string): string | null {
  const name = value.replace(/[/\\]/g, '_').trim();
  return name === '' || name === '.' || name === '..' ? null : name;
}

export type RemoteFilterDescriptor = ResourceFilterDescriptor;
export type RemoteSortDescriptor = ResourceSortDescriptor;
export type RemoteLoadOptions = ResourceLoadOptions;
export type RemoteDataSourceOptions = ResourceStoreOptions;

const defaultHttpClient = createCoreHttpClient({ baseUrl: '' });

function findPreloadedItem(
  loadOptions: RemoteLoadOptions,
  idField: string,
  id: unknown,
): DataRecord | null {
  const prependData = Array.isArray(loadOptions.prependData) ? loadOptions.prependData : [];
  const appendData = Array.isArray(loadOptions.appendData) ? loadOptions.appendData : [];
  const candidates = [...prependData, ...appendData];

  return candidates.find((item) => item[idField] === id || item['@id'] === id) ?? null;
}

function addIriField(url: string, item: DataRecord): DataRecord {
  const itemId = item['id'] ?? item['code'] ?? item['uuid'] ?? item['slug'];
  const iri =
    typeof item['@id'] === 'string'
      ? item['@id']
      : typeof itemId === 'string' || typeof itemId === 'number'
        ? `${url}/${itemId}`
        : undefined;
  return { ...item, _iri: iri };
}

type FilterTuple = [string, string, unknown];

function isFilterTuple(rule: unknown): rule is FilterTuple {
  return (
    Array.isArray(rule) &&
    rule.length === 3 &&
    typeof rule[0] === 'string' &&
    typeof rule[1] === 'string'
  );
}

function isFilterRuleObject(rule: unknown): rule is { field: string; operator: string; value: unknown } {
  return (
    !!rule &&
    typeof rule === 'object' &&
    'field' in rule &&
    'operator' in rule &&
    'value' in rule
  );
}

function coerceFilterTuple(rule: unknown): ResourceFilterDescriptor {
  if (isFilterTuple(rule)) {
    return rule;
  }

  if (isFilterRuleObject(rule)) {
    return [rule.field, rule.operator, rule.value];
  }

  if (Array.isArray(rule)) {
    if (rule.length > 0 && Array.isArray(rule[0])) {
      return rule as ResourceFilterDescriptor;
    }
    return rule as ResourceFilterDescriptor;
  }

  return [rule];
}

function normalizeFilterRules(
  filterRules: ResourceFilterDescriptor,
  defaultFilterRules: ResourceFilterDescriptor[],
): ResourceFilterDescriptor[] {
  const filters: ResourceFilterDescriptor[] = [];
  defaultFilterRules.forEach((rule) => filters.push(coerceFilterTuple(rule)));

  if (filterRules.length === 3 && typeof filterRules[0] !== 'object') {
    filters.push([filterRules[0], filterRules[1], filterRules[2]]);
    return filters;
  }

  filterRules.forEach((rule) => {
    filters.push(coerceFilterTuple(rule));
  });

  return filters;
}

function applyLoadOptionDefaults(
  loadOptions: ResourceLoadOptions,
  options: ResourceLoadOption[],
): ResourceLoadOptions {
  const nextOptions: ResourceLoadOptions = { ...loadOptions };

  options.forEach((option) => {
    for (const key in option) {
      if (Object.prototype.hasOwnProperty.call(option, key)) {
        nextOptions[key] = option[key];
      }
    }
  });

  return nextOptions;
}

function normalizeSortRules(
  sortRules: ResourceSortDescriptor[],
  defaultSortRules: ResourceSortDescriptor[],
  idField: string,
): ResourceSortDescriptor[] {
  const [firstSort] = sortRules;
  const firstSelector = typeof firstSort === 'string' ? firstSort : firstSort?.selector;

  if (sortRules.length === 1 && firstSelector === idField && defaultSortRules.length === 0) {
    return [];
  }

  if (sortRules.length === 1 && firstSelector === idField) {
    return [...defaultSortRules];
  }

  return sortRules;
}

function stripAdapterOnlyParams(loadOptions: ResourceLoadOptions): ResourceLoadOptions {
  const nextOptions: ResourceLoadOptions = { ...loadOptions };
  delete nextOptions.searchOperation;

  if (nextOptions.searchExpr === undefined) {
    delete nextOptions.searchValue;
  }

  return nextOptions;
}

/**
 * prependData/appendData are client-side merge instructions consumed in
 * `fetchAll` after the response comes back — they were never meant to leave
 * the browser. `preparedOptions` (which still carries them, for `fetchAll`
 * to read) doubles as the HTTP request's query params, so left in place
 * they'd serialize into the URL as a wall of prependData[0][...] params:
 * harmless to the server, which ignores unrecognized filters, but noisy and
 * wasteful.
 */
function stripMergeOnlyParams(loadOptions: ResourceLoadOptions): ResourceLoadOptions {
  const nextOptions: ResourceLoadOptions = { ...loadOptions };
  delete nextOptions.prependData;
  delete nextOptions.appendData;
  return nextOptions;
}

function convertPaginationParams(loadOptions: ResourceLoadOptions): ResourceLoadOptions {
  const nextOptions: ResourceLoadOptions = { ...loadOptions };

  const take = typeof nextOptions.take === 'number' ? nextOptions.take : undefined;
  const skip = typeof nextOptions.skip === 'number' ? nextOptions.skip : undefined;

  if (take !== undefined) {
    nextOptions.itemsPerPage = take;
    delete nextOptions.take;
  }

  if (take !== undefined && skip !== undefined) {
    nextOptions.page = Math.floor(skip / take) + 1;
    delete nextOptions.skip;
  } else if (skip !== undefined) {
    delete nextOptions.skip;
  }

  return nextOptions;
}

function getFlatIriFilter(filter: unknown): unknown[] | null {
  if (!Array.isArray(filter)) return null;
  return filter.length === 1 && Array.isArray(filter[0]) ? filter[0] : filter;
}

function parseGridSummaryHeader(headers: Headers): Record<string, unknown> | null {
  const raw = headers.get('x-grid-summary');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function parseCollectionResponse(
  responseData: unknown,
  responseHeaders: Headers,
): { data: DataRecord[]; totalCount: number; gridSummary: Record<string, unknown> | null } {
  const gridSummary = parseGridSummaryHeader(responseHeaders);
  if (Array.isArray(responseData)) {
    const headerCount = Number(responseHeaders.get('x-total-count'));
    return {
      data: responseData as DataRecord[],
      totalCount: Number.isFinite(headerCount) ? headerCount : responseData.length,
      gridSummary,
    };
  }

  if (responseData && typeof responseData === 'object') {
    const body = responseData as DataRecord;
    const member = body['hydra:member'] ?? body['member'];
    if (Array.isArray(member)) {
      const rawTotal = body['hydra:totalItems'] ?? body['totalItems'] ?? member.length;
      const totalCount = Number(rawTotal);
      return {
        data: member as DataRecord[],
        totalCount: Number.isFinite(totalCount) ? totalCount : member.length,
        gridSummary,
      };
    }
  }

  return { data: [], totalCount: 0, gridSummary };
}

export class HydraRemoteDataSource implements ResourceStore {
  private readonly httpClient: CoreHttpClient;

  constructor(private readonly config: ResourceStoreOptions) {
    this.httpClient = config.httpClient ?? defaultHttpClient;
  }

  makeFilterRules(filterRules: ResourceFilterRule[]): string {
    return filterRules
      .map((filter) => `filter[]=["${filter.field}","${filter.operator}","${filter.value}"]`)
      .join('&');
  }

  prepareLoadOptions(loadOptions: ResourceLoadOptions): ResourceLoadOptions {
    const withDefaults = applyLoadOptionDefaults(loadOptions, this.config.options ?? []);
    const normalizedFilters = normalizeFilterRules(
      (withDefaults.filter ?? []) as RemoteFilterDescriptor,
      this.config.defaultFilterRules ?? [],
    );

    return convertPaginationParams(stripAdapterOnlyParams({
      ...withDefaults,
      filter: normalizedFilters,
      sort: normalizeSortRules(
        withDefaults.sort ?? [],
        this.config.defaultSortRules ?? [],
        this.config.idField,
      ),
    }));
  }

  async load(loadOptions: ResourceLoadOptions): Promise<GridData<DataRecord>> {
    const preparedOptions = this.prepareLoadOptions(loadOptions);

    if (this.config.iriMode) {
      const flatFilter = getFlatIriFilter(preparedOptions.filter);
      if (
        Array.isArray(flatFilter) &&
        flatFilter.length === 3 &&
        flatFilter[0] === '_iri' &&
        flatFilter[1] === '=' &&
        typeof flatFilter[2] === 'string'
      ) {
        const item = await this.byKey(flatFilter[2]);
        return {
          data: item ? [addIriField(this.config.url, item)] : [],
          totalCount: item ? 1 : 0,
          summary: null,
        };
      }

      const result = await this.fetchAll(preparedOptions);
      return {
        ...result,
        data: result.data.map((item) => addIriField(this.config.url, item)),
      };
    }

    return this.fetchAll(preparedOptions);
  }

  async export(loadOptions: ResourceLoadOptions): Promise<ResourceExportResult> {
    const preparedOptions = this.prepareLoadOptions({ ...loadOptions, skip: undefined, take: undefined });
    delete preparedOptions.itemsPerPage;
    delete preparedOptions.page;

    const response = await this.httpClient.get<Blob>(this.config.url, {
      params: stripMergeOnlyParams(preparedOptions),
      headers: { Accept: XLSX_MIME_TYPE },
      responseType: 'blob',
    });

    return {
      blob: response.data,
      filename: parseContentDispositionFilename(response.headers, 'export.xlsx'),
    };
  }

  async byKey(key: unknown): Promise<DataRecord | null> {
    const id = typeof key === 'object' && key !== null ? (key as DataRecord)[this.config.idField] : key;
    if (id === undefined) return null;

    const loadOptions = applyLoadOptionDefaults({}, this.config.options ?? []);
    const item = await this.fetchById(this.config.byKeyUrl ?? this.config.url, id, loadOptions);

    return this.config.iriMode && item ? addIriField(this.config.url, item) : item;
  }

  private async fetchAll(loadOptions: RemoteLoadOptions): Promise<GridData<DataRecord>> {
    const response = await this.httpClient.get<unknown>(this.config.url, {
      params: stripMergeOnlyParams(loadOptions),
    });
    const parsed = parseCollectionResponse(response.data, response.headers);
    let data = parsed.data;

    // appendData/prependData exist so the currently-selected option stays
    // visible even when the default query would otherwise exclude it (e.g.
    // it's already assigned elsewhere and the resource's own list filters
    // "available" items). That item is frequently *also* returned by the
    // query itself (no filter active yet, page still shows it, …) — without
    // deduping, the same record renders twice with the same identity, which
    // React (correctly) flags as a duplicate key in the option list.
    //
    // prependData/appendData items are pre-normalized (they went through a
    // prior `byKey`/`addIriField` pass, e.g. for the currently-selected
    // entity) while `data` fresh off the wire hasn't yet — for a plain REST
    // API (no JSON-LD `@id`) that means the prepended item already carries a
    // synthesized `_iri` the matching raw item doesn't have yet, so keying
    // off idField/@id first misses the match entirely. The natural id-like
    // fields (id/code/uuid/slug) survive normalization unchanged on both
    // sides, so check those first and only fall back to @id/idField for
    // IRI-only entities that never had one.
    const itemKey = (item: DataRecord): unknown =>
      item['id'] ?? item['code'] ?? item['uuid'] ?? item['slug'] ?? item['@id'] ?? item[this.config.idField];
    const dedupeAgainst = (extra: DataRecord[], existing: DataRecord[]): DataRecord[] => {
      const existingKeys = new Set(existing.map(itemKey));
      return extra.filter((item) => !existingKeys.has(itemKey(item)));
    };

    if (loadOptions.appendData) {
      data = [...data, ...dedupeAgainst(loadOptions.appendData, data)];
    }
    if (loadOptions.prependData) {
      data = [...dedupeAgainst(loadOptions.prependData, data), ...data];
    }

    const totalCount = parsed.totalCount === parsed.data.length ? data.length : parsed.totalCount;
    return {
      data,
      totalCount,
      summary: null,
      gridSummary: parsed.gridSummary,
    };
  }

  private async fetchById(
    url: string,
    id: unknown,
    loadOptions: ResourceLoadOptions,
  ): Promise<DataRecord | null> {
    const preloadedItem = findPreloadedItem(loadOptions, this.config.idField, id);
    if (preloadedItem) return preloadedItem;

    const resolvedUrl = typeof id === 'string' && id.startsWith('/') ? id : `${url}/${id}`;

    return this.httpClient
      .get<DataRecord>(resolvedUrl)
      .then((response) => response.data)
      .catch(() => findPreloadedItem(loadOptions, this.config.idField, id));
  }
}

export const createHydraResourceStore: ResourceStoreFactory = (options) =>
  new HydraRemoteDataSource(options);
