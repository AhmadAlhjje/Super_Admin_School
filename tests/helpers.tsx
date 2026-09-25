import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import type { ApiClient } from '../src/shared/api/client';
import { ApiError } from '../src/shared/api/errors';
import type { CurrentUser } from '../src/shared/api/types';
import { AuthProvider } from '../src/shared/auth/auth-context';
import { UploadManagerProvider } from '../src/shared/features/uploads/upload-manager';
import { PlatformContext } from '../src/shared/platform/platform-context';
import type { PortalConfig } from '../src/shared/platform/portal';

type Handler = (body?: unknown) => unknown;

/**
 * Test double for the API client: routes "METHOD /path" to handlers. Unhandled calls fail the
 * test loudly. (A stand-in transport for component tests only — the real client is tested
 * separately in api-client.test.ts.)
 */
export function fakeApi(routes: Record<string, Handler>, options: { loggedIn?: CurrentUser | null } = {}) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const call = (method: string) =>
    vi.fn((url: string, body?: unknown) => {
      calls.push({ method, url, body });
      const handler = routes[`${method} ${url}`];
      if (!handler) return Promise.reject(new Error(`Unhandled fake API call: ${method} ${url}`));
      const result = handler(body);
      return result instanceof ApiError ? Promise.reject(result) : Promise.resolve(result);
    });
  const loggedIn = options.loggedIn ?? null;
  const api: ApiClient & { calls: typeof calls } = {
    baseUrl: 'http://api.test',
    calls,
    get: call('GET') as ApiClient['get'],
    post: call('POST') as ApiClient['post'],
    put: call('PUT') as ApiClient['put'],
    patch: call('PATCH') as ApiClient['patch'],
    delete: call('DELETE') as ApiClient['delete'],
    upload: call('UPLOAD') as unknown as ApiClient['upload'],
    download: vi.fn(),
    setAccessToken: vi.fn(),
    refresh: vi.fn(() => Promise.resolve(loggedIn ? 'token' : null)),
  };
  if (loggedIn) routes['GET /auth/me'] ??= () => loggedIn;
  return api;
}

export const ownerConfig: PortalConfig = { portal: 'OWNER_WEB', role: 'OWNER', apiBaseUrl: 'http://api.test', nav: [] };
export const adminConfig: PortalConfig = {
  portal: 'ADMIN_WEB',
  role: 'SUPER_ADMIN',
  apiBaseUrl: 'http://api.test',
  nav: [],
};

export function user(role: CurrentUser['role']): CurrentUser {
  return {
    id: 'u1',
    role,
    name: role === 'OWNER' ? 'صاحب المعهد' : 'مدير النظام',
    phone: '0911111111',
    status: 'ACTIVE',
    archived: false,
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    grade: null,
  };
}

export function renderWithPlatform(
  ui: ReactElement,
  { api, config = ownerConfig, route = '/' }: { api: ApiClient; config?: PortalConfig; route?: string },
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlatformContext.Provider value={{ api, config }}>
        <AuthProvider>
          <UploadManagerProvider>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
          </UploadManagerProvider>
        </AuthProvider>
      </PlatformContext.Provider>
    </QueryClientProvider>,
  );
}
