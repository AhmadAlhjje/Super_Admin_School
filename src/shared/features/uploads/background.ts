import type { FileScope } from '../../api/types';
import type { PreparedUpload } from '../../lib/compress-file';

/**
 * Background uploads: once handed to the browser (Background Fetch), an upload keeps going after
 * the dashboard is closed, and survives a restart of the browser. Chrome and Edge offer this on
 * HTTPS sites (and localhost); elsewhere uploads run in the page (upload-manager.tsx).
 *
 * The service worker (public/upload-sw.js) only handles these uploads: it is registered under a
 * scope no page uses, so it never controls or caches the dashboard. Each upload is one background
 * fetch whose id carries what the worker and a later visit need, including the upload token
 * (valid for that upload only, while the user's session lasts).
 */
const WORKER_URL = '/upload-sw.js';
const WORKER_SCOPE = '/__uploads/';

// ─── Background Fetch API (not yet in TypeScript's DOM types) ────────────────
export interface BackgroundFetchRegistration extends EventTarget {
  readonly id: string;
  readonly uploadTotal: number;
  readonly uploaded: number;
  readonly result: '' | 'success' | 'failure';
  readonly failureReason: string;
  abort(): Promise<boolean>;
}

interface BackgroundFetchManager {
  fetch(id: string, requests: Request[], options?: { title?: string }): Promise<BackgroundFetchRegistration>;
  get(id: string): Promise<BackgroundFetchRegistration | undefined>;
  getIds(): Promise<string[]>;
}

export type UploadWorker = ServiceWorkerRegistration & { backgroundFetch: BackgroundFetchManager };

// ─── Upload ids ─────────────────────────────────────────────────────────────
export type BackgroundUpload =
  | { kind: 'video'; videoId: string; token: string }
  | { kind: 'file'; scope: FileScope; parentId: string; title: string; token: string };

export function encodeUploadId(upload: BackgroundUpload, stamp = Date.now()): string {
  return upload.kind === 'video'
    ? ['v', upload.videoId, stamp, upload.token].join('|')
    : ['f', upload.scope, upload.parentId, encodeURIComponent(upload.title), stamp, upload.token].join('|');
}

export function decodeUploadId(id: string): BackgroundUpload | null {
  const parts = id.split('|');
  if (parts[0] === 'v' && parts.length === 4) return { kind: 'video', videoId: parts[1]!, token: parts[3]! };
  if (parts[0] === 'f' && parts.length === 6) {
    return {
      kind: 'file',
      scope: parts[1] as FileScope,
      parentId: parts[2]!,
      title: decodeURIComponent(parts[3]!),
      token: parts[5]!,
    };
  }
  return null;
}

// ─── Availability and the worker ────────────────────────────────────────────
/** Background uploads need HTTPS, Background Fetch, and the API on the site's own address. */
export function backgroundUploadsPossible(apiBaseUrl: string): boolean {
  if (typeof window === 'undefined' || !window.isSecureContext) return false;
  if (!('serviceWorker' in navigator) || !('BackgroundFetchManager' in window)) return false;
  try {
    return !apiBaseUrl || new URL(apiBaseUrl).origin === window.location.origin;
  } catch {
    return false;
  }
}

let worker: Promise<UploadWorker | null> | null = null;

/** The registered upload worker, once active; `null` when the browser refuses it. */
export function uploadWorker(): Promise<UploadWorker | null> {
  worker ??= (async () => {
    try {
      const registration = await navigator.serviceWorker.register(WORKER_URL, {
        scope: WORKER_SCOPE,
        updateViaCache: 'none',
      });
      const pending = registration.installing ?? registration.waiting;
      if (!registration.active && pending) {
        await new Promise<void>((resolve) => {
          const check = () => pending.state === 'activated' && resolve();
          pending.addEventListener('statechange', check);
          check();
        });
      }
      return 'backgroundFetch' in registration ? (registration as UploadWorker) : null;
    } catch {
      return null;
    }
  })();
  return worker;
}

export async function backgroundUploads(registration: UploadWorker): Promise<BackgroundFetchRegistration[]> {
  const ids = await registration.backgroundFetch.getIds();
  const found = await Promise.all(ids.map((id) => registration.backgroundFetch.get(id)));
  return found.filter((item): item is BackgroundFetchRegistration => item !== undefined);
}

// ─── Starting uploads ───────────────────────────────────────────────────────
/** Sends the missing chunks of a video; the worker completes the upload when all arrived. */
export function uploadVideoInBackground(
  registration: UploadWorker,
  input: {
    apiRoot: string;
    videoId: string;
    token: string;
    file: Blob;
    chunkSize: number;
    missingChunks: number[];
    notificationTitle: string;
  },
): Promise<BackgroundFetchRegistration> {
  const requests = input.missingChunks.map(
    (index) =>
      new Request(`${input.apiRoot}/videos/${input.videoId}/upload/chunks/${index}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream', 'X-Upload-Token': input.token },
        body: input.file.slice(index * input.chunkSize, (index + 1) * input.chunkSize),
      }),
  );
  return registration.backgroundFetch.fetch(
    encodeUploadId({ kind: 'video', videoId: input.videoId, token: input.token }),
    requests,
    { title: input.notificationTitle },
  );
}

/** Sends one prepared file (see compress-file.ts). */
export function uploadFileInBackground(
  registration: UploadWorker,
  input: {
    apiRoot: string;
    scope: FileScope;
    parentId: string;
    title: string;
    token: string;
    prepared: PreparedUpload;
    notificationTitle: string;
  },
): Promise<BackgroundFetchRegistration> {
  const request = new Request(`${input.apiRoot}/files?scope=${input.scope}&parentId=${input.parentId}`, {
    method: 'POST',
    headers: { ...input.prepared.headers, 'X-Upload-Token': input.token },
    body: input.prepared.body,
  });
  return registration.backgroundFetch.fetch(
    encodeUploadId({
      kind: 'file',
      scope: input.scope,
      parentId: input.parentId,
      title: input.title,
      token: input.token,
    }),
    [request],
    { title: input.notificationTitle },
  );
}

/** Resolves when the browser finished sending (reporting progress), rejects if it gave up. */
export function followBackgroundUpload(
  upload: BackgroundFetchRegistration,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const update = () => {
      if (upload.uploadTotal > 0) onProgress(Math.min(99, (upload.uploaded / upload.uploadTotal) * 100));
      if (upload.result === 'success') {
        upload.removeEventListener('progress', update);
        resolve();
      } else if (upload.result === 'failure') {
        upload.removeEventListener('progress', update);
        reject(new Error(upload.failureReason || 'failed'));
      }
    };
    upload.addEventListener('progress', update);
    update();
  });
}
