import type { ApiClient } from '../client';
import type { AuditLogRow, DeviceRow, OwnerAccount, Paginated, SystemSettings, SystemStats } from '../types';

/** Super-admin-only endpoints (the backend rejects them for any other role). */
export const adminApi = (api: ApiClient) => ({
  systemStats: () => api.get<SystemStats>('/dashboard/system'),

  owners: () => api.get<OwnerAccount[]>('/admin/owners'),
  owner: (id: string) => api.get<OwnerAccount>(`/admin/owners/${id}`),
  createOwner: (body: { name: string; phone: string; password: string }) =>
    api.post<OwnerAccount>('/admin/owners', body),
  updateOwner: (id: string, body: { name?: string; phone?: string }) =>
    api.patch<OwnerAccount>(`/admin/owners/${id}`, body),
  resetOwnerPassword: (id: string, newPassword: string) =>
    api.post(`/admin/owners/${id}/reset-password`, { newPassword }),
  setOwnerEnabled: (id: string, enabled: boolean) =>
    api.post<OwnerAccount>(`/admin/owners/${id}/${enabled ? 'enable' : 'disable'}`),

  devices: (params: { page?: number; search?: string; status?: 'ACTIVE' | 'RESET' | 'all' }) =>
    api.get<Paginated<DeviceRow>>('/devices', { limit: 20, ...params }),
  resetDevice: (id: string) => api.post(`/devices/${id}/reset`),

  auditLogs: (params: { page?: number; action?: string; from?: string; to?: string; entityId?: string }) =>
    api.get<Paginated<AuditLogRow>>('/audit-logs', { limit: 25, ...params }),
  auditActions: () => api.get<string[]>('/audit-logs/actions'),

  settings: () => api.get<SystemSettings>('/admin/settings'),
  updateSettings: (body: Partial<SystemSettings>) => api.patch<SystemSettings>('/admin/settings', body),
});
