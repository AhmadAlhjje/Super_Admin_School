import type { AxiosProgressEvent } from 'axios';
import type { ApiClient } from '../client';
import type { PreparedUpload } from '../../lib/compress-file';
import type { ContentFile, FileScope, LifecycleFilter, PlaybackGrant, UploadInfo, Video } from '../types';

/** Lets an upload continue without the access token (background uploads, header X-Upload-Token). */
export interface UploadToken {
  uploadToken: string;
  uploadTokenExpiresAt: string;
}

export interface VideoUploadPlan extends UploadToken {
  video: Video;
  upload: UploadInfo & { receivedChunks: number[] };
}

export const videosApi = (api: ApiClient) => ({
  get: (id: string) => api.get<Video>(`/videos/${id}`),
  create: (body: { sessionId: string; title: string; fileName: string; fileSize: number; mimeType: string }) =>
    api.post<VideoUploadPlan>('/videos', body),
  uploadStatus: (id: string) => api.get<VideoUploadPlan>(`/videos/${id}/upload`),
  uploadChunk: (
    id: string,
    index: number,
    chunk: Blob,
    onProgress: (e: AxiosProgressEvent) => void,
    signal?: AbortSignal,
  ) => api.upload(`/videos/${id}/upload/chunks/${index}`, chunk, onProgress, signal),
  complete: (id: string) => api.post<VideoUploadPlan>(`/videos/${id}/upload/complete`),
  restart: (id: string, body: { fileName: string; fileSize: number; mimeType: string }) =>
    api.post<VideoUploadPlan>(`/videos/${id}/upload/restart`, body),
  update: (id: string, body: { title?: string; description?: string | null }) =>
    api.patch<Video>(`/videos/${id}`, body),
  archive: (id: string) => api.post<Video>(`/videos/${id}/archive`),
  restore: (id: string) => api.post<Video>(`/videos/${id}/restore`),
  reorder: (sessionId: string, ids: string[]) => api.put('/videos/reorder', { sessionId, ids }),
  preview: (id: string) => api.post<PlaybackGrant>(`/videos/${id}/preview`),
});

export const filesApi = (api: ApiClient) => ({
  list: (scope: FileScope, parentId: string, status: LifecycleFilter = 'all') =>
    api.get<ContentFile[]>('/files', { scope, parentId, status }),
  upload: (
    scope: FileScope,
    parentId: string,
    file: File,
    title: string | null,
    onProgress?: (e: AxiosProgressEvent) => void,
  ) => {
    const form = new FormData();
    // Fields first, file last (streamed server-side).
    if (title) form.append('title', title);
    form.append('file', file);
    return api.upload<ContentFile>(`/files?scope=${scope}&parentId=${parentId}`, form, onProgress);
  },
  update: (id: string, title: string) => api.patch<ContentFile>(`/files/${id}`, { title }),
  archive: (id: string) => api.post<ContentFile>(`/files/${id}/archive`),
  restore: (id: string) => api.post<ContentFile>(`/files/${id}/restore`),
  reorder: (scope: FileScope, parentId: string, ids: string[]) => api.put('/files/reorder', { scope, parentId, ids }),
  download: (id: string) => api.download(`/files/${id}/download`),
  /** Sends a body made by `prepareFileUpload` (possibly compressed). */
  uploadPrepared: (
    scope: FileScope,
    parentId: string,
    prepared: PreparedUpload,
    onProgress?: (e: AxiosProgressEvent) => void,
  ) =>
    api.upload<ContentFile>(`/files?scope=${scope}&parentId=${parentId}`, prepared.body, onProgress, undefined, {
      method: 'POST',
      headers: prepared.headers,
    }),
  uploadToken: (scope: FileScope, parentId: string) =>
    api.post<UploadToken>(`/files/upload-token?scope=${scope}&parentId=${parentId}`),
});
