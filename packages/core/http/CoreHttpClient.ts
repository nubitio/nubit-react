import type { DataRecord } from '../data/DataRecord';
import { discoverMercureFromResponse } from '../mercure/mercureDiscovery';
import { generateCorrelationId } from './correlationId';

export type CoreResponseType = 'json' | 'arraybuffer' | 'blob' | 'text';

export interface CoreRequestConfig {
  params?: DataRecord;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  responseType?: CoreResponseType;
}

export interface CoreHttpResponse<T> {
  response: Response;
  data: T;
  headers: Headers;
  status: number;
  /**
   * The correlation id sent with this request under `correlationIdHeaderName`,
   * present only when `enableCorrelationId` is on and the request resolved
   * against `baseUrl` (see {@link CoreHttpClientConfig.enableCorrelationId}).
   */
  correlationId?: string;
}

export interface CoreHttpErrorData {
  detail?: string;
  message?: string;
  violations?: unknown;
  [key: string]: unknown;
}

export interface CoreHttpError extends Error {
  status?: number;
  data?: CoreHttpErrorData;
  /** The correlation id sent with the request that failed, if enabled. See {@link CoreHttpResponse.correlationId}. */
  correlationId?: string;
}

/** Default value of {@link CoreHttpClientConfig.csrfHeaderName}. */
export const DEFAULT_CSRF_HEADER_NAME = 'X-CSRF-Token';

/** Default value of {@link CoreHttpClientConfig.correlationIdHeaderName}. */
export const DEFAULT_CORRELATION_ID_HEADER_NAME = 'X-Request-Id';

/**
 * HTTP methods `getCsrfToken` is consulted for. Matches the conventional
 * "safe methods don't need CSRF protection" rule (GET/HEAD never mutate
 * state), so read requests never pay the cost of a token lookup.
 */
const CSRF_PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface CoreHttpClientConfig {
  baseUrl?: string;
  credentials?: RequestCredentials;
  locale?: string;

  /**
   * Path used by the built-in cookie refresh logic (only used when no `refreshFn` is provided).
   * @default "auth/refresh"
   */
  refreshPath?: string;

  /**
   * Path used to detect "this is a login attempt" (skips auto-refresh).
   * @default "auth/login"
   */
  loginPath?: string;

  /**
   * If false, the client will never attempt automatic session refresh on 401.
   * Useful when you want full control (e.g. Bearer JWT + react-query error handling).
   * @default true
   */
  autoRefresh?: boolean;

  /**
   * Completely replace the internal refresh logic.
   * If provided, this function is called instead of the built-in cookie refresh.
   * Should throw (or return a rejected promise) when refresh fails.
   *
   * Example (custom Bearer token refresh):
   *   refreshFn: async (client) => {
   *     const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
   *     if (!res.ok) throw new Error('Refresh failed');
   *     const { accessToken } = await res.json();
   *     // store token somewhere your requests can use it (e.g. in memory or secure storage)
   *   }
   */
  refreshFn?: (client: CoreHttpClient) => Promise<void>;

  onUnauthorized?: (error: CoreHttpError) => void;
  onError?: (error: CoreHttpError) => void;

  /**
   * Supplies request headers that can change between calls — most commonly
   * an `Authorization: Bearer <token>` header for apps that keep the access
   * token in memory or storage instead of relying solely on the cookie
   * session. Called before every request, including the built-in refresh
   * request, so a fresh token is always read rather than captured once at
   * client construction time.
   *
   * Omitting this (or returning an empty object) adds no headers — the
   * client still works purely on cookies, exactly as before this option
   * existed.
   *
   * Example:
   *   getAuthHeaders: () => {
   *     const token = tokenStore.get();
   *     return token ? { Authorization: `Bearer ${token}` } : {};
   *   }
   */
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;

  /**
   * Supplies a CSRF token to attach to state-changing requests (POST, PUT,
   * PATCH, DELETE — see `CSRF_PROTECTED_METHODS`). Not called for GET/HEAD.
   * Return `undefined` to skip the header for a given call (e.g. no token
   * available yet).
   *
   * Example (cookie double-submit pattern):
   *   getCsrfToken: () => readCookie('CSRF_TOKEN')
   */
  getCsrfToken?: (method: string) => string | undefined | Promise<string | undefined>;

  /**
   * Header name the token from `getCsrfToken` is sent under.
   * @default "X-CSRF-Token"
   */
  csrfHeaderName?: string;

  /**
   * When true, every request that resolves against `baseUrl` carries a
   * generated correlation id under `correlationIdHeaderName`. The same id is
   * reused across a 401 → refresh → retry sequence, and is returned on
   * `CoreHttpResponse.correlationId` / `CoreHttpError.correlationId` so an
   * app can surface it in a support/error UI — including when the request
   * never receives a response at all (network failure, timeout), since the
   * id is generated client-side before the request is sent.
   *
   * Requests to a fully-qualified `http(s)://` URL on a different origin
   * (see `joinUrl`) never receive the header, regardless of this setting:
   * correlation ids are for your own backend, and adding a custom header to
   * a third-party request can turn a "simple" CORS request into a
   * preflighted one for APIs that don't expect it.
   *
   * Disabled by default — opting in is an explicit choice because it adds a
   * header to every internal request.
   *
   * @default false
   */
  enableCorrelationId?: boolean;

  /**
   * Header name the correlation id is sent under. Match this to whatever
   * your backend reads (Nubit backends read `X-Request-Id` by convention).
   * @default "X-Request-Id"
   */
  correlationIdHeaderName?: string;

  /**
   * Overrides how the correlation id is generated. Defaults to
   * {@link generateCorrelationId}. Mainly useful for tests that need a
   * deterministic id, or apps that want to reuse an id minted earlier (e.g.
   * for a request that was queued while offline).
   */
  getCorrelationId?: () => string;
}

function joinUrl(baseUrl: string, url: string): string {
  if (/^https?:\/\//.test(url) || url.startsWith('/')) {
    return url;
  }

  return `${baseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

function serializeParams(params: DataRecord): string {
  const parts: string[] = [];

  function append(prefix: string, value: unknown): void {
    if (value === null || value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((item, index) => append(`${prefix}[${index}]`, item));
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value as DataRecord).forEach(([key, nestedValue]) => {
        append(`${prefix}[${key}]`, nestedValue);
      });
      return;
    }

    parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  }

  Object.entries(params).forEach(([key, value]) => append(key, value));
  return parts.join('&');
}

function withParams(url: string, params?: DataRecord): string {
  if (!params || Object.keys(params).length === 0) return url;

  const query = serializeParams(params);
  if (!query) return url;

  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}

function createHttpError(
  message: string,
  status?: number,
  data?: CoreHttpErrorData,
  correlationId?: string,
): CoreHttpError {
  return Object.assign(new Error(message), { status, data, correlationId });
}

/**
 * A fully-qualified `http(s)://` URL targets a different origin than the
 * app's own `baseUrl` (or is at least not guaranteed to be the same one —
 * see `joinUrl`, which passes these through unchanged). Root-relative
 * (`/path`) and bare relative (`path`) URLs always resolve against this
 * app's own origin/baseUrl, so they're the only ones eligible for the
 * correlation-id header.
 */
function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

async function readResponseBody<T>(
  response: Response,
  responseType?: CoreResponseType,
): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  if (responseType === 'arraybuffer') return (await response.arrayBuffer()) as T;
  if (responseType === 'blob') return (await response.blob()) as T;
  if (responseType === 'text') return (await response.text()) as T;

  return (await response.json()) as T;
}

export class CoreHttpClient {
  private refreshPromise: Promise<void> | null = null;

  constructor(private readonly config: CoreHttpClientConfig = {}) {}

  /**
   * Builds the full header set for one request: static locale, then dynamic
   * auth headers, then CSRF (mutating methods only), then correlation id,
   * then the caller's own `extraHeaders` — which always win, so a specific
   * call can still override anything the config-level hooks produced.
   */
  private async headers(
    method: string,
    extraHeaders?: Record<string, string>,
    correlationId?: string,
  ): Promise<Record<string, string>> {
    const browserLocale =
      typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : undefined;
    const locale = this.config.locale ?? browserLocale ?? 'en';

    const authHeaders = this.config.getAuthHeaders ? await this.config.getAuthHeaders() : undefined;

    let csrfHeader: Record<string, string> | undefined;
    if (this.config.getCsrfToken && CSRF_PROTECTED_METHODS.has(method)) {
      const token = await this.config.getCsrfToken(method);
      if (token) {
        csrfHeader = { [this.config.csrfHeaderName ?? DEFAULT_CSRF_HEADER_NAME]: token };
      }
    }

    const correlationHeader =
      correlationId !== undefined
        ? {
            [this.config.correlationIdHeaderName ?? DEFAULT_CORRELATION_ID_HEADER_NAME]:
              correlationId,
          }
        : undefined;

    return {
      'Accept-Language': locale,
      ...authHeaders,
      ...csrfHeader,
      ...correlationHeader,
      ...extraHeaders,
    };
  }

  /** A fresh correlation id for one logical request, or undefined when disabled/not applicable. */
  private correlationIdFor(url: string): string | undefined {
    if (!this.config.enableCorrelationId || isExternalUrl(url)) return undefined;
    return (this.config.getCorrelationId ?? generateCorrelationId)();
  }

  /**
   * Built-in cookie-based refresh (the original behavior).
   * Only used when `refreshFn` is not provided in config.
   *
   * Carries the same auth/CSRF headers as an ordinary request — a
   * CSRF-protected backend protects its refresh endpoint too — and its own
   * correlation id, minted fresh rather than borrowed from whichever
   * request(s) triggered it, since one shared refresh can be triggered by
   * several concurrent requests at once (see the dedup logic below) and
   * there is no single "right" id to inherit from among them.
   */
  private async performBuiltInRefresh(): Promise<void> {
    const refreshPath = this.config.refreshPath ?? 'auth/refresh';
    const refreshUrl = joinUrl(this.config.baseUrl ?? '/api/', refreshPath);

    this.refreshPromise ??= (async () => {
      const correlationId = this.correlationIdFor(refreshPath);
      const headers = await this.headers('POST', undefined, correlationId);
      const response = await globalThis.fetch(refreshUrl, {
        method: 'POST',
        headers,
        credentials: this.config.credentials ?? 'include',
      });
      if (!response.ok) {
        throw createHttpError(
          'Session refresh failed',
          response.status,
          await this.safeErrorData(response),
          correlationId,
        );
      }
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async performRefresh(): Promise<void> {
    if (this.config.refreshFn) {
      return this.config.refreshFn(this);
    }
    return this.performBuiltInRefresh();
  }

  private async safeErrorData(response: Response): Promise<CoreHttpErrorData> {
    try {
      return (await response.json()) as CoreHttpErrorData;
    } catch {
      return {};
    }
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    config?: CoreRequestConfig,
    retryOnUnauthorized = true,
    /**
     * Correlation id carried over from the original attempt when this call
     * is a 401 → refresh → retry. Undefined on the first attempt, where it's
     * computed fresh below — keeping one id across the whole logical
     * request rather than minting a new one per network attempt.
     */
    inheritedCorrelationId?: string,
  ): Promise<CoreHttpResponse<T>> {
    const requestUrl = withParams(joinUrl(this.config.baseUrl ?? '/api/', url), config?.params);
    const correlationId = inheritedCorrelationId ?? this.correlationIdFor(url);
    const headers = await this.headers(method, config?.headers, correlationId);

    if (body !== undefined && body !== null && !(body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
    }

    const response = await globalThis.fetch(requestUrl, {
      method,
      headers,
      credentials: this.config.credentials ?? 'include',
      signal: config?.signal,
      body:
        body === undefined || body === null
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });

    if (response.ok) {
      const data = await readResponseBody<T>(response, config?.responseType);
      if (config?.responseType === undefined || config.responseType === 'json') {
        discoverMercureFromResponse(response, data);
      }
      return {
        response,
        data,
        headers: response.headers,
        status: response.status,
        correlationId,
      };
    }

    const errorData = await this.safeErrorData(response);
    const error = createHttpError(
      errorData.detail ?? errorData.message ?? 'HTTP request failed',
      response.status,
      errorData,
      correlationId,
    );

    const loginPath = this.config.loginPath ?? 'auth/login';
    const refreshPath = this.config.refreshPath ?? 'auth/refresh';
    const isAuthEndpoint = url.includes(loginPath) || url.includes(refreshPath);

    const shouldAutoRefresh = this.config.autoRefresh !== false; // default true for backward compat

    if (response.status === 401 && retryOnUnauthorized && !isAuthEndpoint && shouldAutoRefresh) {
      try {
        await this.performRefresh();
        return this.request<T>(method, url, body, config, false, correlationId);
      } catch (refreshError) {
        const unauthorizedError =
          refreshError instanceof Error
            ? (Object.assign(refreshError, { status: 401, correlationId }) as CoreHttpError)
            : error;
        this.config.onUnauthorized?.(unauthorizedError);
        throw unauthorizedError;
      }
    }

    if (response.status === 401) {
      this.config.onUnauthorized?.(error);
    } else {
      this.config.onError?.(error);
    }

    throw error;
  }

  get<T>(url: string, config?: CoreRequestConfig): Promise<CoreHttpResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  post<T>(url: string, data?: unknown, config?: CoreRequestConfig): Promise<CoreHttpResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  put<T>(url: string, data?: unknown, config?: CoreRequestConfig): Promise<CoreHttpResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  patch<T>(url: string, data?: unknown, config?: CoreRequestConfig): Promise<CoreHttpResponse<T>> {
    return this.request<T>('PATCH', url, data, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'application/merge-patch+json',
      },
    });
  }

  delete<T>(url: string, config?: CoreRequestConfig): Promise<CoreHttpResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

export function createCoreHttpClient(config?: CoreHttpClientConfig): CoreHttpClient {
  return new CoreHttpClient(config);
}
