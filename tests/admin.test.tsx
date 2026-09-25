import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { adminConfig, fakeApi, renderWithPlatform, user } from './helpers';
import { AuditLogsPage } from '../src/features/audit/AuditLogsPage';
import { SettingsPage } from '../src/features/settings/SettingsPage';
import { portalConfig } from '../src/portal';

describe('super admin dashboard configuration', () => {
  it('signs in through the admin portal and includes system administration', () => {
    expect(portalConfig.portal).toBe('ADMIN_WEB');
    expect(portalConfig.role).toBe('SUPER_ADMIN');
    const paths = portalConfig.nav.map((item) => item.to);
    for (const required of [
      '/',
      '/students',
      '/teachers',
      '/grades',
      '/subjects',
      '/content',
      '/devices',
      '/audit-logs',
      '/settings',
    ]) {
      expect(paths).toContain(required);
    }
  });
});

const settings = {
  instituteName: 'معهد النور',
  institutePhone: null,
  studentSelfRegistration: false,
  watermarkEnabled: true,
  offlineDownloadsEnabled: true,
  offlineLicenseDays: 14,
};

describe('system settings', () => {
  it('saves a toggled setting through the settings API', async () => {
    const api = fakeApi(
      {
        'GET /admin/settings': () => settings,
        'PATCH /admin/settings': (body) => ({ ...settings, ...(body as object) }),
      },
      { loggedIn: user('SUPER_ADMIN') },
    );
    renderWithPlatform(<SettingsPage />, { api, config: adminConfig });
    const toggle = await screen.findByRole('switch', { name: 'السماح للطلاب بالتسجيل الذاتي' });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(api.calls.some((c) => c.method === 'PATCH')).toBe(true));
    expect(api.calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({
      studentSelfRegistration: true,
      instituteName: 'معهد النور',
      institutePhone: null,
    });
  });
});

describe('audit log', () => {
  it('shows translated actions and actors, read-only', async () => {
    const api = fakeApi(
      {
        'GET /audit-logs/actions': () => ['RESET_DEVICE', 'LOGIN'],
        'GET /audit-logs': () => ({
          items: [
            {
              id: 'a1',
              actorId: 'u1',
              actorRole: 'SUPER_ADMIN',
              action: 'RESET_DEVICE',
              entityType: 'device',
              entityId: 'd1',
              ipAddress: '10.0.0.1',
              userAgent: 'test',
              metadata: { studentId: 's1' },
              createdAt: '2026-09-20T10:00:00.000Z',
              actor: { id: 'u1', name: 'مدير النظام', role: 'SUPER_ADMIN' },
            },
          ],
          page: 1,
          limit: 25,
          total: 1,
          totalPages: 1,
        }),
      },
      { loggedIn: user('SUPER_ADMIN') },
    );
    renderWithPlatform(<AuditLogsPage />, { api, config: adminConfig });
    expect((await screen.findAllByText('إعادة ضبط جهاز')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('مدير النظام').length).toBeGreaterThan(0);
    expect(api.calls.every((c) => c.method === 'GET')).toBe(true);
  });
});
