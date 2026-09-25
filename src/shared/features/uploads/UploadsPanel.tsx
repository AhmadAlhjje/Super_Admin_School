import { CheckCircle2, UploadCloud, X, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '../../lib/format';
import { IconButton } from '../../ui/button';
import { ProgressBar } from '../../ui/feedback';
import { useUploads, type UploadTask } from './upload-manager';

/** User-facing upload state: only "uploading X%", "ready" or "failed" — never internal stages. */
export function UploadTaskStatus({ task }: { task: UploadTask }) {
  const { t } = useTranslation();
  if (task.phase === 'done') {
    return (
      <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
        <CheckCircle2 className="size-4" aria-hidden /> {t('videos.ready')}
      </p>
    );
  }
  if (task.phase === 'error') {
    return (
      <p role="alert" className="flex items-center gap-1.5 text-sm font-semibold text-danger">
        <XCircle className="size-4" aria-hidden /> {task.error ?? t('videos.uploadFailed')}
      </p>
    );
  }
  const percent = Math.floor(task.percent);
  return (
    <div className="flex flex-col gap-1.5">
      <ProgressBar
        value={task.phase === 'processing' ? undefined : task.percent}
        label={t('videos.uploading', { percent })}
      />
      <p className="text-xs text-secondary" aria-live="polite">
        {task.phase === 'processing' ? t('videos.uploadingShort') : t('videos.uploading', { percent })}
      </p>
    </div>
  );
}

/** Floating panel listing uploads; stays visible while navigating the dashboard. */
export function UploadsPanel() {
  const { t } = useTranslation();
  const { tasks, dismiss } = useUploads();
  if (tasks.length === 0) return null;
  return (
    <aside
      aria-label={t('videos.uploadsPanel')}
      className="fixed bottom-4 end-4 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-border bg-surface shadow-xl"
    >
      <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-bold text-text">
        <UploadCloud className="size-4 text-primary" aria-hidden /> {t('videos.uploadsPanel')}
      </h2>
      <ul className="max-h-72 divide-y divide-border overflow-y-auto">
        {tasks.map((task) => (
          <li key={task.key} className="flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{task.title}</p>
              <p className="mb-2 truncate text-xs text-secondary">
                {task.fileName} · <span className="ltr-nums">{formatBytes(task.sizeBytes)}</span>
              </p>
              <UploadTaskStatus task={task} />
            </div>
            {(task.phase === 'done' || task.phase === 'error') && (
              <IconButton label={t('common.close')} onClick={() => dismiss(task.key)}>
                <X className="size-4" />
              </IconButton>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
