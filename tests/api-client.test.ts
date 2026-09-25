import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../src/shared/api/client';
import { ApiError } from '../src/shared/api/errors';

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> {
  const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse;
  if (status >= 200 && status < 300) return Promise.resolve(response);
  return Promise.reject(new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', config, null, response));
}

const ok = (data: unknown) => ({ success: true, data, message: null, meta: null });
const fail = (code: string) => ({ success: false, data: null, message: code, error: { code, details: null } });

describe('API client', () => {
  it('unwraps the success envelope', async () => {
    const adapter: AxiosAdapter = (config) => respond(config, 200, ok({ hello: 'world' }));
    const api = createApiClient({ baseUrl: 'http://api.test/', portal: 'OWNER_WEB', onSessionEnded: vi.fn(), adapter });
    await expect(api.get('/anything')).resolves.toEqual({ hello: 'world' });
  });

  it('turns error envelopes into ApiError with the backend code', async () => {
    const adapter: AxiosAdapter = (config) => respond(config, 409, fail('PHONE_ALREADY_EXISTS'));
    const api = createApiClient({ baseUrl: 'http://api.test', portal: 'OWNER_WEB', onSessionEnded: vi.fn(), adapter });
    const error = await api.post('/students', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'PHONE_ALREADY_EXISTS', status: 409 });
  });

  it('refreshes once for concurrent expired-token failures and replays the requests', async () => {
    let refreshCalls = 0;
    const adapter: AxiosAdapter = (config) => {
      if (config.url === '/auth/refresh') {
        refreshCalls += 1;
        expect(JSON.parse(config.data as string)).toEqual({ portal: 'OWNER_WEB' });
        return respond(config, 200, ok({ accessToken: 'fresh-token' }));
      }
      const auth = config.headers.get('Authorization');
      if (auth === 'Bearer fresh-token') return respond(config, 200, ok({ url: config.url }));
      return respond(config, 401, fail('TOKEN_EXPIRED'));
    };
    const onSessionEnded = vi.fn();
    const api = createApiClient({ baseUrl: 'http://api.test', portal: 'OWNER_WEB', onSessionEnded, adapter });
    api.setAccessToken('expired-token');

    const results = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);
    expect(results).toEqual([{ url: '/a' }, { url: '/b' }, { url: '/c' }]);
    expect(refreshCalls).toBe(1);
    expect(onSessionEnded).not.toHaveBeenCalled();
  });

  it('ends the session when the refresh token is no longer valid', async () => {
    const adapter: AxiosAdapter = (config) =>
      config.url === '/auth/refresh'
        ? respond(config, 401, fail('REFRESH_TOKEN_INVALID'))
        : respond(config, 401, fail('TOKEN_EXPIRED'));
    const onSessionEnded = vi.fn();
    const api = createApiClient({ baseUrl: 'http://api.test', portal: 'ADMIN_WEB', onSessionEnded, adapter });
    api.setAccessToken('expired');
    await expect(api.get('/students')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
  });

  it('ends the session immediately when it was revoked server-side', async () => {
    const adapter: AxiosAdapter = (config) => respond(config, 401, fail('SESSION_REVOKED'));
    const onSessionEnded = vi.fn();
    const api = createApiClient({ baseUrl: 'http://api.test', portal: 'OWNER_WEB', onSessionEnded, adapter });
    await expect(api.get('/students')).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
  });

  it('reports network failures as NETWORK errors', async () => {
    const adapter: AxiosAdapter = (config) => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', config));
    const api = createApiClient({ baseUrl: 'http://api.test', portal: 'OWNER_WEB', onSessionEnded: vi.fn(), adapter });
    await expect(api.get('/x')).rejects.toMatchObject({ code: 'NETWORK', status: 0 });
  });
});
