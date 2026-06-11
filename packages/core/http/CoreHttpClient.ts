import type { DataRecord } from '../data/DataRecord';

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
}

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

function createHttpError(message: string, status?: number, data?: CoreHttpErrorData): CoreHttpError {
  return Object.assign(new Error(message), { status, data });
}

async function readResponseBody<T>(response: Response, responseType?: CoreResponseType): Promise<T> {
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

  private headers(extraHeaders?: Record<string, string>): Record<string, string> {
    const browserLocale = typeof navigator !== 'undefined'
      ? navigator.language?.split('-')[0]
      : undefined;
    const locale = this.config.locale ?? browserLocale ?? 'es';

    return {
      'Accept-Language': locale,
      ...extraHeaders,
    };
  }

  /**
   * Built-in cookie-based refresh (the original behavior).
   * Only used when `refreshFn` is not provided in config.
   */
  private async performBuiltInRefresh(): Promise<void> {
    const refreshPath = this.config.refreshPath ?? 'auth/refresh';
    const refreshUrl = joinUrl(this.config.baseUrl ?? '/api/', refreshPath);

    this.refreshPromise ??= globalThis.fetch(refreshUrl, {
      method: 'POST',
      credentials: this.config.credentials ?? 'include',
    }).then(async (response) => {
      if (!response.ok) {
        throw createHttpError('Session refresh failed', response.status, await this.safeErrorData(response));
      }
    }).finally(() => {
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
  ): Promise<CoreHttpResponse<T>> {
    const requestUrl = withParams(joinUrl(this.config.baseUrl ?? '/api/', url), config?.params);
    const headers = this.headers(config?.headers);

    if (body !== undefined && body !== null && !(body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
    }

    const response = await globalThis.fetch(requestUrl, {
      method,
      headers,
      credentials: this.config.credentials ?? 'include',
      signal: config?.signal,
      body: body === undefined || body === null ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });

    if (response.ok) {
      return {
        response,
        data: await readResponseBody<T>(response, config?.responseType),
        headers: response.headers,
        status: response.status,
      };
    }

    const errorData = await this.safeErrorData(response);
    const error = createHttpError(
      errorData.detail ?? errorData.message ?? 'HTTP request failed',
      response.status,
      errorData,
    );

    const loginPath = this.config.loginPath ?? 'auth/login';
    const refreshPath = this.config.refreshPath ?? 'auth/refresh';
    const isAuthEndpoint = url.includes(loginPath) || url.includes(refreshPath);

    const shouldAutoRefresh = this.config.autoRefresh !== false; // default true for backward compat

    if (response.status === 401 && retryOnUnauthorized && !isAuthEndpoint && shouldAutoRefresh) {
      try {
        await this.performRefresh();
        return this.request<T>(method, url, body, config, false);
      } catch (refreshError) {
        const unauthorizedError = refreshError instanceof Error
          ? Object.assign(refreshError, { status: 401 }) as CoreHttpError
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
