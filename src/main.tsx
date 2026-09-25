import { createDashboardRouter, Page, PlatformProvider } from './shared';
import { lazy, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './index.css';
import { portalConfig } from './portal';

// Admin-only pages, code-split like the shared ones.
const SystemOverviewPage = lazy(() =>
  import('./features/system/SystemOverviewPage').then((m) => ({ default: m.SystemOverviewPage })),
);
const DevicesPage = lazy(() => import('./features/devices/DevicesPage').then((m) => ({ default: m.DevicesPage })));
const AuditLogsPage = lazy(() => import('./features/audit/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const OwnerPage = lazy(() => import('./features/owner/OwnerPage').then((m) => ({ default: m.OwnerPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const router = createDashboardRouter({
  home: <SystemOverviewPage />,
  extraPages: [
    {
      path: 'devices',
      element: (
        <Page>
          <DevicesPage />
        </Page>
      ),
    },
    {
      path: 'audit-logs',
      element: (
        <Page>
          <AuditLogsPage />
        </Page>
      ),
    },
    {
      path: 'owner',
      element: (
        <Page>
          <OwnerPage />
        </Page>
      ),
    },
    {
      path: 'settings',
      element: (
        <Page>
          <SettingsPage />
        </Page>
      ),
    },
  ],
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlatformProvider config={portalConfig}>
      <RouterProvider router={router} />
    </PlatformProvider>
  </StrictMode>,
);
