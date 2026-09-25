import type { ApiClient } from '../client';
import type {
  Grade,
  GradeDetails,
  LifecycleFilter,
  Paginated,
  SessionDetails,
  SessionRow,
  Subject,
  SubjectDetails,
  SubjectTeacherRow,
  SubjectTeacherSpace,
  Teacher,
  TeacherDetails,
  TopicDetails,
  TopicRow,
} from '../types';

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: LifecycleFilter;
}

type Nullable<T> = { [K in keyof T]: T[K] | null };

export const gradesApi = (api: ApiClient) => ({
  list: (params: { status?: LifecycleFilter; search?: string } = {}) => api.get<Grade[]>('/grades', params),
  get: (id: string) => api.get<GradeDetails>(`/grades/${id}`),
  create: (body: { name: string; description?: string | null }) => api.post<Grade>('/grades', body),
  update: (id: string, body: Partial<Nullable<{ name: string; description: string }>>) =>
    api.patch<Grade>(`/grades/${id}`, body),
  archive: (id: string) => api.post<GradeDetails>(`/grades/${id}/archive`),
  restore: (id: string) => api.post<GradeDetails>(`/grades/${id}/restore`),
  reorder: (ids: string[]) => api.put('/grades/reorder', { ids }),
});

export const subjectsApi = (api: ApiClient) => ({
  list: (params: ListParams & { gradeId?: string } = {}) => api.get<Paginated<Subject>>('/subjects', params),
  get: (id: string) => api.get<SubjectDetails>(`/subjects/${id}`),
  create: (body: { gradeId: string; name: string; description?: string | null }) =>
    api.post<Subject>('/subjects', body),
  update: (
    id: string,
    body: Partial<{
      gradeId: string;
      name: string;
      description: string | null;
    }>,
  ) => api.patch<Subject>(`/subjects/${id}`, body),
  archive: (id: string) => api.post<SubjectDetails>(`/subjects/${id}/archive`),
  restore: (id: string) => api.post<SubjectDetails>(`/subjects/${id}/restore`),
  reorder: (gradeId: string, ids: string[]) => api.put('/subjects/reorder', { gradeId, ids }),
  assignTeacher: (subjectId: string, teacherId: string) =>
    api.post<SubjectTeacherRow>(`/subjects/${subjectId}/teachers`, {
      teacherId,
    }),
  reorderTeachers: (subjectId: string, ids: string[]) => api.put(`/subjects/${subjectId}/teachers/reorder`, { ids }),
});

export const subjectTeachersApi = (api: ApiClient) => ({
  get: (id: string, status: LifecycleFilter = 'all') =>
    api.get<SubjectTeacherSpace>(`/subject-teachers/${id}`, { status }),
  unassign: (id: string) => api.post<SubjectTeacherSpace>(`/subject-teachers/${id}/archive`),
  restore: (id: string) => api.post<SubjectTeacherSpace>(`/subject-teachers/${id}/restore`),
});

export const teachersApi = (api: ApiClient) => ({
  list: (params: ListParams = {}) => api.get<Paginated<Teacher>>('/teachers', params),
  get: (id: string) => api.get<TeacherDetails>(`/teachers/${id}`),
  create: (body: { name: string; phone?: string | null; description?: string | null; subjectIds: string[] }) =>
    api.post<TeacherDetails>('/teachers', body),
  update: (
    id: string,
    body: Partial<{
      name: string;
      phone: string | null;
      description: string | null;
    }>,
  ) => api.patch<TeacherDetails>(`/teachers/${id}`, body),
  archive: (id: string) => api.post<TeacherDetails>(`/teachers/${id}/archive`),
  restore: (id: string) => api.post<TeacherDetails>(`/teachers/${id}/restore`),
  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<TeacherDetails>(`/teachers/${id}/image`, form);
  },
  removeImage: (id: string) => api.delete<TeacherDetails>(`/teachers/${id}/image`),
});

export const topicsApi = (api: ApiClient) => ({
  get: (id: string) => api.get<TopicDetails>(`/topics/${id}`, { status: 'all' }),
  create: (body: { subjectTeacherId: string; title: string; description?: string | null }) =>
    api.post<TopicRow>('/topics', body),
  update: (id: string, body: { title?: string; description?: string | null }) => api.patch(`/topics/${id}`, body),
  archive: (id: string) => api.post(`/topics/${id}/archive`),
  restore: (id: string) => api.post(`/topics/${id}/restore`),
  reorder: (subjectTeacherId: string, ids: string[]) => api.put('/topics/reorder', { subjectTeacherId, ids }),
});

export const sessionsApi = (api: ApiClient) => ({
  get: (id: string) => api.get<SessionDetails>(`/sessions/${id}`, { status: 'all' }),
  create: (body: { topicId: string; title: string; description?: string | null }) =>
    api.post<SessionRow>('/sessions', body),
  update: (id: string, body: { title?: string; description?: string | null }) => api.patch(`/sessions/${id}`, body),
  archive: (id: string) => api.post(`/sessions/${id}/archive`),
  restore: (id: string) => api.post(`/sessions/${id}/restore`),
  reorder: (topicId: string, ids: string[]) => api.put('/sessions/reorder', { topicId, ids }),
});
