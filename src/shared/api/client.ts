import axios, { type AxiosAdapter, type AxiosInstance, type AxiosProgressEvent, type AxiosRequestConfig } from 'axios';
import i18n from '../i18n/i18n';
import { toApiError } from './errors';
import type { WebPortal } from './types';

/**
 * HTTP client for one dashboard portal.
 *
 * - The access token lives only in memory (never localStorage); the refresh token is an
 *   httpOnly cookie the browser sends to /api/v1/auth only.
 * - On TOKEN_EXPIRED the client refreshes once and replays the request. Concurrent failures
 *   share one refresh (single-flight), and refreshes are serialized across browser tabs with
 *   the Web Locks API so two tabs never race the same rotating refresh cookie.
 * - Responses are unwrapped from the `{ success, data }` envelope; errors become ApiError.
 */
export interface ApiClient {
  get<T>(url: string, params?: object): Promise<T>;
  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T>(url: string, body?: unknown): Promise<T>;
  delete<T>(url: string): Promise<T>;
  upload<T>(
    url: string,
    body: FormData | Blob,
    onProgress?: (event: AxiosProgressEvent) => void,
    signal?: AbortSignal,
    /** Prepared bodies: method and headers (e.g. a gzip-compressed multipart body sent with POST). */
    options?: { method?: 'POST' | 'PUT'; headers?: Record<string, string> },
  ): Promise<T>;
  download(url: string): Promise<Blob>;
  setAccessToken(token: string | null): void;
  refresh(): Promise<string | null>;
  readonly baseUrl: string;
}

interface Options {
  baseUrl: string;
  portal: WebPortal;
  /** Called when the session can no longer be refreshed (revoked, expired, disabled). */
  onSessionEnded: () => void;
  /** Transport override (tests exercise the real refresh logic without a network). */
  adapter?: AxiosAdapter;
}

const REFRESHABLE = new Set(['TOKEN_EXPIRED', 'TOKEN_INVALID', 'UNAUTHENTICATED']);
const SESSION_ENDED = new Set(['SESSION_REVOKED', 'ACCOUNT_DISABLED', 'REFRESH_TOKEN_INVALID']);

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

export function createApiClient({ baseUrl, portal, onSessionEnded, adapter }: Options): ApiClient {
  const root = baseUrl.replace(/\/+$/, '');
  const http: AxiosInstance = axios.create({
    baseURL: `${root}/api/v1`,
    withCredentials: true,
    timeout: 60_000,
    ...(adapter ? { adapter } : {}),
  });
  let accessToken: string | null = null;
  let inFlight: Promise<string | null> | null = null;

  http.interceptors.request.use((config) => {
    if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
    config.headers.set('Accept-Language', i18n.language);
    return config;
  });

  async function performRefresh(): Promise<string | null> {
    try {
      const res = await http.post<{ data: { accessToken: string } }>('/auth/refresh', { portal });
      accessToken = res.data.data.accessToken;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    }
  }

  function refresh(): Promise<string | null> {
    inFlight ??= (
      typeof navigator !== 'undefined' && 'locks' in navigator
        ? navigator.locks.request(`edu-refresh-${portal}`, performRefresh)
        : performRefresh()
    ).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  http.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const apiError = toApiError(error);
      const config = (error as { config?: RetriableConfig }).config;
      const isAuthCall = config?.url?.startsWith('/auth/') ?? false;

      if (config && !isAuthCall && !config._retried && apiError.status === 401 && REFRESHABLE.has(apiError.code)) {
        config._retried = true;
        const token = await refresh();
        if (token) return http.request(config);
        onSessionEnded();
      } else if (!isAuthCall && SESSION_ENDED.has(apiError.code)) {
        accessToken = null;
        onSessionEnded();
      }
      throw apiError;
    },
  );

  const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((res) => res.data.data);

  return {
    baseUrl: root,
    get: (url, params) => unwrap(http.get(url, { params })),
    post: (url, body, config) => unwrap(http.post(url, body, config)),
    put: (url, body, config) => unwrap(http.put(url, body, config)),
    patch: (url, body) => unwrap(http.patch(url, body)),
    delete: (url) => unwrap(http.delete(url)),
    upload: (url, body, onProgress, signal, options) =>
      unwrap(
        http.request({
          url,
          method: options?.method ?? (body instanceof FormData ? 'POST' : 'PUT'),
          data: body,
          headers: options?.headers ?? (body instanceof FormData ? {} : { 'Content-Type': 'application/octet-stream' }),
          onUploadProgress: onProgress,
          signal,
          timeout: 0,
        }),
      ),
    download: (url) => http.get<Blob>(url, { responseType: 'blob' }).then((res) => res.data),
    setAccessToken: (token) => {
      accessToken = token;
    },
    refresh,
  };
}
