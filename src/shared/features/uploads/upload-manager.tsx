import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { videosApi, type VideoUploadPlan } from '../../api/endpoints/media';
import { errorMessage } from '../../api/errors';
import type { Video } from '../../api/types';
import { useApi } from '../../platform/platform-context';

/**
 * Background video uploads for the dashboard.
 *
 * The file is sent in chunks (size decided by the server). Each chunk is retried with backoff,
 * so flaky connections do not restart a multi-GB upload; an interrupted upload can be resumed
 * later by picking the same file (only missing chunks are sent). After the last chunk the
 * server processes the video; the task keeps showing "uploading" until the video is READY —
 * users never see internal steps (transcoding, encryption, queues).
 */
export type UploadPhase = 'uploading' | 'processing' | 'done' | 'error';

export interface UploadTask {
  key: string;
  videoId: string | null;
  sessionId: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  phase: UploadPhase;
  percent: number;
  error: string | null;
}

interface StartInput {
  sessionId: string;
  title: string;
  file: File;
}

interface UploadManagerValue {
  tasks: UploadTask[];
  start: (input: StartInput) => void;
  /** Continue an interrupted upload (UPLOADING state) or retry a FAILED one with a file. */
  resume: (video: Video, file: File) => void;
  dismiss: (key: string) => void;
  isActive: (videoId: string) => boolean;
}

const UploadManagerContext = createContext<UploadManagerValue | null>(null);

const MAX_CHUNK_ATTEMPTS = 4;
const POLL_INTERVAL_MS = 4000;
const DONE_VISIBLE_MS = 10_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function UploadManagerProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const videos = useMemo(() => videosApi(api), [api]);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const running = useRef(new Set<string>());

  const patch = useCallback((key: string, update: Partial<UploadTask>) => {
    setTasks((current) => current.map((task) => (task.key === key ? { ...task, ...update } : task)));
  }, []);

  const refreshSession = useCallback(
    (sessionId: string) => queryClient.invalidateQueries({ queryKey: ['session', sessionId] }),
    [queryClient],
  );

  const uploadChunks = useCallback(
    async (key: string, plan: VideoUploadPlan, file: File) => {
      const { chunkSize, totalChunks } = plan.upload;
      const received = new Set(plan.upload.receivedChunks);
      let doneBytes = 0;
      for (const index of received) doneBytes += Math.min(chunkSize, file.size - index * chunkSize);

      for (let index = 0; index < totalChunks; index += 1) {
        if (received.has(index)) continue;
        const chunk = file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize));
        for (let attempt = 1; ; attempt += 1) {
          try {
            await videos.uploadChunk(plan.video.id, index, chunk, (event) => {
              patch(key, {
                percent: Math.min(99, ((doneBytes + (event.loaded ?? 0)) / file.size) * 100),
              });
            });
            break;
          } catch (error) {
            if (attempt >= MAX_CHUNK_ATTEMPTS) throw error;
            await sleep(1000 * 2 ** (attempt - 1));
          }
        }
        doneBytes += chunk.size;
        patch(key, { percent: Math.min(99, (doneBytes / file.size) * 100) });
      }
      await videos.complete(plan.video.id);
      patch(key, { phase: 'processing', percent: 100 });
      void refreshSession(plan.video.sessionId);

      // Wait for the server to finish preparing the video (shown as "uploading" to the user).
      for (;;) {
        await sleep(POLL_INTERVAL_MS);
        const video = await videos.get(plan.video.id);
        if (video.displayStatus === 'READY') {
          patch(key, { phase: 'done' });
          // Finished uploads leave the panel on their own; failures stay until dismissed.
          setTimeout(() => setTasks((current) => current.filter((task) => task.key !== key)), DONE_VISIBLE_MS);
          break;
        }
        if (video.displayStatus === 'FAILED') {
          patch(key, { phase: 'error', error: t('videos.uploadFailed') });
          break;
        }
      }
      void refreshSession(plan.video.sessionId);
    },
    [patch, refreshSession, t, videos],
  );

  const run = useCallback(
    (key: string, work: () => Promise<void>) => {
      running.current.add(key);
      work()
        .catch((error: unknown) => patch(key, { phase: 'error', error: errorMessage(error) }))
        .finally(() => running.current.delete(key));
    },
    [patch],
  );

  const start = useCallback(
    ({ sessionId, title, file }: StartInput) => {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setTasks((current) => [
        ...current,
        {
          key,
          videoId: null,
          sessionId,
          title,
          fileName: file.name,
          sizeBytes: file.size,
          phase: 'uploading',
          percent: 0,
          error: null,
        },
      ]);
      run(key, async () => {
        const plan = await videos.create({
          sessionId,
          title,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
        });
        patch(key, { videoId: plan.video.id });
        void refreshSession(sessionId);
        await uploadChunks(key, plan, file);
      });
    },
    [patch, refreshSession, run, uploadChunks, videos],
  );

  const resume = useCallback(
    (video: Video, file: File) => {
      const key = `resume-${video.id}-${Date.now()}`;
      setTasks((current) => [
        ...current.filter((task) => task.videoId !== video.id),
        {
          key,
          videoId: video.id,
          sessionId: video.sessionId,
          title: video.title,
          fileName: file.name,
          sizeBytes: file.size,
          phase: 'uploading',
          percent: 0,
          error: null,
        },
      ]);
      run(key, async () => {
        let plan: VideoUploadPlan;
        if (video.displayStatus === 'FAILED' || video.upload?.status !== 'UPLOADING') {
          plan = await videos.restart(video.id, {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
          });
        } else {
          plan = await videos.uploadStatus(video.id);
          if (Number(plan.upload.sizeBytes) !== file.size) throw new Error(t('videos.fileMismatch'));
        }
        void refreshSession(video.sessionId);
        await uploadChunks(key, plan, file);
      });
    },
    [refreshSession, run, t, uploadChunks, videos],
  );

  const dismiss = useCallback((key: string) => {
    setTasks((current) => current.filter((task) => task.key !== key));
  }, []);

  const isActive = useCallback(
    (videoId: string) =>
      tasks.some((task) => task.videoId === videoId && (task.phase === 'uploading' || task.phase === 'processing')),
    [tasks],
  );

  // Leaving the page would abort in-flight chunk uploads: warn first.
  const hasActiveUploads = tasks.some((task) => task.phase === 'uploading');
  useEffect(() => {
    if (!hasActiveUploads) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasActiveUploads]);

  const value = useMemo(() => ({ tasks, start, resume, dismiss, isActive }), [tasks, start, resume, dismiss, isActive]);
  return <UploadManagerContext.Provider value={value}>{children}</UploadManagerContext.Provider>;
}

export function useUploads(): UploadManagerValue {
  const value = useContext(UploadManagerContext);
  if (!value) throw new Error('useUploads must be used inside <UploadManagerProvider>');
  return value;
}
