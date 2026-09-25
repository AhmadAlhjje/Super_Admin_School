import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { filesApi, videosApi, type VideoUploadPlan } from '../../api/endpoints/media';
import { errorMessage } from '../../api/errors';
import type { FileScope, Video } from '../../api/types';
import { prepareFileUpload } from '../../lib/compress-file';
import {
  compressVideo,
  removeCompressedLeftovers,
  videoCompressionSupported,
  type CompressedVideo,
} from '../../lib/compress-video';
import { runPool } from '../../lib/pool';
import { useApi } from '../../platform/platform-context';
import {
  backgroundUploadsPossible,
  backgroundUploads,
  decodeUploadId,
  followBackgroundUpload,
  uploadFileInBackground,
  uploadVideoInBackground,
  uploadWorker,
  type BackgroundFetchRegistration,
} from './background';

/**
 * Uploads of the dashboard (videos and files), listed in the uploads panel on every page.
 *
 * - Videos can be compressed in the browser first (faster upload, compress-video.ts); files are
 *   made smaller when that helps (compress-file.ts).
 * - Where the browser allows it (Chrome/Edge on HTTPS), the upload is then handed to the browser
 *   and goes on after the site is closed (background.ts); the next visit shows its progress.
 *   Otherwise it runs in the page: each chunk is retried with backoff, and an interrupted upload
 *   is resumed by picking the same file again (only missing chunks are sent).
 * - After the last chunk the server prepares the video; the task shows "uploading" until it is
 *   READY — users never see internal steps (transcoding, encryption, queues).
 */
export type UploadPhase = 'compressing' | 'uploading' | 'processing' | 'done' | 'error';

export interface UploadTask {
  key: string;
  kind: 'video' | 'file';
  videoId: string | null;
  sessionId: string | null;
  title: string;
  fileName: string;
  sizeBytes: number;
  /** The size before compression, when the file was made smaller. */
  originalBytes: number | null;
  phase: UploadPhase;
  percent: number;
  /** Handed to the browser: it continues after the site is closed. */
  background: boolean;
  error: string | null;
}

interface StartVideoInput {
  sessionId: string;
  title: string;
  file: File;
  /** Compress in the browser first (when supported). */
  compress: boolean;
}

interface StartFileInput {
  scope: FileScope;
  parentId: string;
  title: string | null;
  file: File;
}

interface UploadManagerValue {
  tasks: UploadTask[];
  /** This browser can compress videos before upload. */
  canCompress: boolean;
  /** Uploads here continue after the site is closed. */
  canUploadInBackground: boolean;
  start: (input: StartVideoInput) => void;
  startFile: (input: StartFileInput) => void;
  /** Continue an interrupted upload, or start again for a failed one, with a file. */
  resume: (video: Video, file: File) => void;
  dismiss: (key: string) => void;
  isActive: (videoId: string) => boolean;
}

const UploadManagerContext = createContext<UploadManagerValue | null>(null);

const MAX_CHUNK_ATTEMPTS = 4;
/** Chunks sent at the same time (browsers allow 6 connections per site). */
const PARALLEL_CHUNKS = 4;
const POLL_INTERVAL_MS = 4000;
const DONE_VISIBLE_MS = 10_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type NewTask = Pick<UploadTask, 'kind' | 'title' | 'fileName' | 'sizeBytes' | 'phase'> & Partial<UploadTask>;

export function UploadManagerProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const videos = useMemo(() => videosApi(api), [api]);
  const files = useMemo(() => filesApi(api), [api]);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const adopted = useRef(new Set<string>());
  const canCompress = useMemo(() => videoCompressionSupported(), []);
  const canUploadInBackground = useMemo(() => backgroundUploadsPossible(api.baseUrl), [api.baseUrl]);
  const apiRoot = `${api.baseUrl}/api/v1`;

  const add = useCallback((task: NewTask): string => {
    const key = newKey();
    setTasks((current) => [
      ...current.filter((item) => !task.videoId || item.videoId !== task.videoId),
      {
        key,
        videoId: null,
        sessionId: null,
        originalBytes: null,
        percent: 0,
        background: false,
        error: null,
        ...task,
      },
    ]);
    return key;
  }, []);

  const patch = useCallback((key: string, update: Partial<UploadTask>) => {
    setTasks((current) => current.map((task) => (task.key === key ? { ...task, ...update } : task)));
  }, []);

  const finish = useCallback(
    (key: string) => {
      patch(key, { phase: 'done', percent: 100 });
      // Finished uploads leave the panel on their own; failures stay until dismissed.
      setTimeout(() => setTasks((current) => current.filter((task) => task.key !== key)), DONE_VISIBLE_MS);
    },
    [patch],
  );

  const run = useCallback(
    (key: string, work: () => Promise<void>) => {
      work().catch((error: unknown) => patch(key, { phase: 'error', error: errorMessage(error) }));
    },
    [patch],
  );

  const refreshSession = useCallback(
    (sessionId: string) => queryClient.invalidateQueries({ queryKey: ['session', sessionId] }),
    [queryClient],
  );
  const refreshFiles = useCallback(
    (scope: FileScope, parentId: string) => queryClient.invalidateQueries({ queryKey: ['files', scope, parentId] }),
    [queryClient],
  );

  /** The browser's upload worker when uploads can continue after the site is closed. */
  const backgroundWorker = useCallback(
    async () => (canUploadInBackground ? uploadWorker() : null),
    [canUploadInBackground],
  );

  const follow = useCallback(
    async (key: string, upload: BackgroundFetchRegistration) => {
      patch(key, { background: true, phase: 'uploading' });
      try {
        await followBackgroundUpload(upload, (percent) => patch(key, { percent }));
      } catch {
        throw new Error(t('uploads.backgroundFailed'));
      }
    },
    [patch, t],
  );

  /** The server prepares the video (shown as "uploading"): wait until it is READY. */
  const waitUntilReady = useCallback(
    async (key: string, videoId: string, sessionId: string) => {
      patch(key, { phase: 'processing', percent: 0 });
      void refreshSession(sessionId);
      let completedHere = false;
      for (let round = 0; ; round += 1) {
        await sleep(POLL_INTERVAL_MS);
        const video = await videos.get(videoId);
        patch(key, { percent: video.upload?.preparingPercent ?? 0 });
        if (video.displayStatus === 'READY') {
          finish(key);
          break;
        }
        if (video.displayStatus === 'FAILED') {
          patch(key, { phase: 'error', error: t('videos.uploadFailed') });
          break;
        }
        // The upload worker completes background uploads; if that did not happen, do it here.
        if (!completedHere && round >= 2 && video.upload?.status === 'UPLOADING') {
          completedHere = true;
          await videos.complete(videoId).catch(() => undefined);
        }
      }
      void refreshSession(sessionId);
    },
    [finish, patch, refreshSession, t, videos],
  );

  /** Sends the missing chunks (in the background when possible), then waits for READY. */
  const sendVideo = useCallback(
    async (key: string, plan: VideoUploadPlan, file: Blob) => {
      const { chunkSize, totalChunks } = plan.upload;
      const received = new Set(plan.upload.receivedChunks);
      const missing = Array.from({ length: totalChunks }, (_, index) => index).filter((i) => !received.has(i));
      const registration = missing.length > 0 ? await backgroundWorker() : null;

      if (registration) {
        const upload = await uploadVideoInBackground(registration, {
          apiRoot,
          videoId: plan.video.id,
          token: plan.uploadToken,
          file,
          chunkSize,
          missingChunks: missing,
          notificationTitle: t('uploads.notification', { title: plan.video.title }),
        });
        await follow(key, upload);
      } else {
        // Several chunks at once: a long connection to the server is used much better.
        let doneBytes = 0;
        for (const index of received) doneBytes += Math.min(chunkSize, file.size - index * chunkSize);
        const sending = new Map<number, number>();
        const report = () => {
          let bytes = doneBytes;
          for (const loaded of sending.values()) bytes += loaded;
          patch(key, { percent: Math.min(99, (bytes / file.size) * 100) });
        };
        await runPool(missing, PARALLEL_CHUNKS, async (index) => {
          const chunk = file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize));
          for (let attempt = 1; ; attempt += 1) {
            try {
              await videos.uploadChunk(plan.video.id, index, chunk, (event) => {
                sending.set(index, event.loaded ?? 0);
                report();
              });
              break;
            } catch (error) {
              sending.delete(index);
              if (attempt >= MAX_CHUNK_ATTEMPTS) throw error;
              await sleep(1000 * 2 ** (attempt - 1));
            }
          }
          sending.delete(index);
          doneBytes += chunk.size;
          report();
        });
        await videos.complete(plan.video.id);
      }
      await waitUntilReady(key, plan.video.id, plan.video.sessionId);
    },
    [apiRoot, backgroundWorker, follow, patch, t, videos, waitUntilReady],
  );

  /** Compresses when asked and possible; the task shows the progress. */
  const compress = useCallback(
    async (key: string, file: File, wanted: boolean): Promise<CompressedVideo | null> => {
      if (!wanted || !canCompress) return null;
      patch(key, { phase: 'compressing', percent: 0 });
      const compressed = await compressVideo(file, (percent) => patch(key, { percent }));
      if (compressed) {
        patch(key, { fileName: compressed.file.name, sizeBytes: compressed.file.size, originalBytes: file.size });
      }
      patch(key, { phase: 'uploading', percent: 0 });
      return compressed;
    },
    [canCompress, patch],
  );

  const start = useCallback(
    ({ sessionId, title, file, compress: wanted }: StartVideoInput) => {
      const key = add({
        kind: 'video',
        sessionId,
        title,
        fileName: file.name,
        sizeBytes: file.size,
        phase: wanted && canCompress ? 'compressing' : 'uploading',
      });
      run(key, async () => {
        const compressed = await compress(key, file, wanted);
        const source = compressed?.file ?? file;
        try {
          const plan = await videos.create({
            sessionId,
            title,
            fileName: source.name,
            fileSize: source.size,
            mimeType: source.type || 'application/octet-stream',
          });
          patch(key, { videoId: plan.video.id });
          void refreshSession(sessionId);
          await sendVideo(key, plan, source);
        } finally {
          await compressed?.dispose();
        }
      });
    },
    [add, canCompress, compress, patch, refreshSession, run, sendVideo, videos],
  );

  const resume = useCallback(
    (video: Video, file: File) => {
      const key = add({
        kind: 'video',
        videoId: video.id,
        sessionId: video.sessionId,
        title: video.title,
        fileName: file.name,
        sizeBytes: file.size,
        phase: 'uploading',
      });
      run(key, async () => {
        // The same file as the interrupted upload: send only its missing chunks.
        if (video.displayStatus !== 'FAILED' && video.upload?.status === 'UPLOADING') {
          const plan = await videos.uploadStatus(video.id);
          if (Number(plan.upload.sizeBytes) === file.size) {
            await sendVideo(key, plan, file);
            return;
          }
        }
        // Otherwise (failed, or the original of a compressed upload): upload it again.
        const compressed = await compress(key, file, true);
        const source = compressed?.file ?? file;
        try {
          const plan = await videos.restart(video.id, {
            fileName: source.name,
            fileSize: source.size,
            mimeType: source.type || 'application/octet-stream',
          });
          void refreshSession(video.sessionId);
          await sendVideo(key, plan, source);
        } finally {
          await compressed?.dispose();
        }
      });
    },
    [add, compress, refreshSession, run, sendVideo, videos],
  );

  const startFile = useCallback(
    ({ scope, parentId, title, file }: StartFileInput) => {
      const displayTitle = title ?? file.name.replace(/\.[^.]+$/, '');
      const key = add({
        kind: 'file',
        title: displayTitle,
        fileName: file.name,
        sizeBytes: file.size,
        phase: 'compressing',
      });
      run(key, async () => {
        const prepared = await prepareFileUpload(file, title);
        if (prepared.body.size < file.size) patch(key, { sizeBytes: prepared.body.size, originalBytes: file.size });
        patch(key, { phase: 'uploading', percent: 0 });
        const registration = await backgroundWorker();
        if (registration) {
          const { uploadToken } = await files.uploadToken(scope, parentId);
          const upload = await uploadFileInBackground(registration, {
            apiRoot,
            scope,
            parentId,
            title: displayTitle,
            token: uploadToken,
            prepared,
            notificationTitle: t('uploads.notification', { title: displayTitle }),
          });
          await follow(key, upload);
        } else {
          await files.uploadPrepared(scope, parentId, prepared, (event) => {
            if (event.total) patch(key, { percent: Math.min(99, (event.loaded / event.total) * 100) });
          });
        }
        void refreshFiles(scope, parentId);
        finish(key);
      });
    },
    [add, apiRoot, backgroundWorker, files, finish, follow, patch, refreshFiles, run, t],
  );

  /** Shows (and finishes) uploads that went on in the background while the site was closed. */
  const adopt = useCallback(
    async (upload: BackgroundFetchRegistration) => {
      const info = decodeUploadId(upload.id);
      if (!info || adopted.current.has(upload.id)) return;
      adopted.current.add(upload.id);
      if (info.kind === 'video') {
        const video = await videos.get(info.videoId).catch(() => null);
        if (!video) return;
        const key = add({
          kind: 'video',
          videoId: video.id,
          sessionId: video.sessionId,
          title: video.title,
          fileName: video.upload?.originalFileName ?? '',
          sizeBytes: Number(video.upload?.sizeBytes ?? 0),
          phase: 'uploading',
          background: true,
        });
        run(key, async () => {
          await follow(key, upload);
          await waitUntilReady(key, video.id, video.sessionId);
        });
      } else {
        const key = add({
          kind: 'file',
          title: info.title,
          fileName: info.title,
          sizeBytes: upload.uploadTotal,
          phase: 'uploading',
          background: true,
        });
        run(key, async () => {
          await follow(key, upload);
          void refreshFiles(info.scope, info.parentId);
          finish(key);
        });
      }
    },
    [add, finish, follow, refreshFiles, run, videos, waitUntilReady],
  );

  useEffect(() => {
    if (!canUploadInBackground) return;
    let cancelled = false;
    void (async () => {
      const registration = await uploadWorker();
      if (!registration || cancelled) return;
      const active = await backgroundUploads(registration);
      // Compressed copies are kept while the browser may still be sending them.
      if (active.length === 0) await removeCompressedLeftovers();
      for (const upload of active) if (!cancelled) void adopt(upload);
    })();
    return () => {
      cancelled = true;
    };
  }, [adopt, canUploadInBackground]);

  const dismiss = useCallback((key: string) => {
    setTasks((current) => current.filter((task) => task.key !== key));
  }, []);

  const isActive = useCallback(
    (videoId: string) =>
      tasks.some(
        (task) =>
          task.videoId === videoId &&
          (task.phase === 'compressing' || task.phase === 'uploading' || task.phase === 'processing'),
      ),
    [tasks],
  );

  // Leaving the page stops compression and in-page uploads (background ones go on): warn first.
  const needsPage = tasks.some(
    (task) => task.phase === 'compressing' || (task.phase === 'uploading' && !task.background),
  );
  useEffect(() => {
    if (!needsPage) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [needsPage]);

  const value = useMemo(
    () => ({ tasks, canCompress, canUploadInBackground, start, startFile, resume, dismiss, isActive }),
    [tasks, canCompress, canUploadInBackground, start, startFile, resume, dismiss, isActive],
  );
  return <UploadManagerContext.Provider value={value}>{children}</UploadManagerContext.Provider>;
}

export function useUploads(): UploadManagerValue {
  const value = useContext(UploadManagerContext);
  if (!value) throw new Error('useUploads must be used inside <UploadManagerProvider>');
  return value;
}
