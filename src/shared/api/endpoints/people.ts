import type { ApiClient } from '../client';
import type {
  AccessTree,
  AccountStatus,
  CurrentUser,
  InstituteStats,
  LoginResponse,
  NotificationAudience,
  Paginated,
  SentNotification,
  StudentActivity,
  StudentDetails,
  StudentListItem,
  WebPortal,
} from '../types';

export const authApi = (api: ApiClient, portal: WebPortal) => ({
  login: (phone: string, password: string) =>
    api.post<LoginResponse>(portal === 'ADMIN_WEB' ? '/auth/admin/login' : '/auth/owner/login', { phone, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<CurrentUser>('/auth/me'),
  changePassword: (body: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api.post<{ revokedSessions: number }>('/auth/change-password', body),
});

export interface StudentListParams {
  page?: number;
  limit?: number;
  search?: string;
  accountStatus?: AccountStatus | 'all';
  lifecycle?: 'active' | 'archived' | 'all';
  gradeId?: string;
  sort?: 'createdAt' | 'name' | 'lastLoginAt';
  order?: 'asc' | 'desc';
}

export interface StudentInput {
  name: string;
  phone: string;
  gradeId: string | null;
  notes: string | null;
}

export const studentsApi = (api: ApiClient) => ({
  list: (params: StudentListParams) => api.get<Paginated<StudentListItem>>('/students', params),
  get: (id: string) => api.get<StudentDetails>(`/students/${id}`),
  create: (body: StudentInput & { password: string }) => api.post<StudentDetails>('/students', body),
  update: (id: string, body: Partial<StudentInput>) => api.patch<StudentDetails>(`/students/${id}`, body),
  disable: (id: string) => api.post<StudentDetails>(`/students/${id}/disable`),
  enable: (id: string) => api.post<StudentDetails>(`/students/${id}/enable`),
  archive: (id: string) => api.post<StudentDetails>(`/students/${id}/archive`),
  restore: (id: string) => api.post<StudentDetails>(`/students/${id}/restore`),
  resetPassword: (id: string, newPassword: string) => api.post(`/students/${id}/reset-password`, { newPassword }),
  resetDevice: (id: string) => api.post<StudentDetails>(`/students/${id}/device/reset`),
  activity: (id: string) => api.get<StudentActivity>(`/students/${id}/activity`),
});

export const accessApi = (api: ApiClient) => ({
  tree: (studentId: string) => api.get<AccessTree>(`/access/students/${studentId}`),
  setSubject: (studentId: string, subjectId: string, open: boolean) =>
    api.put<AccessTree>(`/access/students/${studentId}/subjects/${subjectId}`, {
      open,
    }),
  setTeacher: (studentId: string, subjectTeacherId: string, open: boolean) =>
    api.put<AccessTree>(`/access/students/${studentId}/subject-teachers/${subjectTeacherId}`, { open }),
});

export const dashboardApi = (api: ApiClient) => ({
  stats: () => api.get<InstituteStats>('/dashboard/stats'),
});

export const notificationsApi = (api: ApiClient) => ({
  list: (page: number) => api.get<Paginated<SentNotification>>('/notifications', { page, limit: 20 }),
  send: (body: { title: string; body: string; audience: NotificationAudience }) =>
    api.post<{ id: string }>('/notifications', body),
});
