import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Toaster } from 'sonner';
import { createApiClient } from '../api/client';
import { ApiError } from '../api/errors';
import { AuthProvider, SESSION_ENDED, sessionEvents } from '../auth/auth-context';
import { UploadManagerProvider } from '../features/uploads/upload-manager';
import i18n from '../i18n/i18n';
import { PlatformContext } from './platform-context';
import type { PortalConfig } from './portal';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Retry only transient failures (network / 5xx), never 4xx business errors.
        retry: (failureCount, error) =>
          failureCount < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
      },
      mutations: { retry: false },
    },
  });
}

function LocalizedToaster() {
  const { i18n: instance } = useTranslation();
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      dir={instance.dir()}
      toastOptions={{ style: { fontFamily: 'inherit' } }}
    />
  );
}

/** Root provider for a dashboard: API client, data cache, auth session, uploads, toasts, i18n. */
export function PlatformProvider({ config, children }: { config: PortalConfig; children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: config.apiBaseUrl,
        portal: config.portal,
        onSessionEnded: () => sessionEvents.dispatchEvent(new Event(SESSION_ENDED)),
      }),
    [config.apiBaseUrl, config.portal],
  );
  const platform = useMemo(() => ({ config, api }), [config, api]);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <PlatformContext.Provider value={platform}>
          <AuthProvider>
            <UploadManagerProvider>
              {children}
              <LocalizedToaster />
            </UploadManagerProvider>
          </AuthProvider>
        </PlatformContext.Provider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
