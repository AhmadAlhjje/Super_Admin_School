import { Film, Info } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '../../lib/format';
import { Button } from '../../ui/button';
import { Field, Input } from '../../ui/form';
import { Modal } from '../../ui/overlay';
import { useUploads } from '../uploads/upload-manager';

const ACCEPT = 'video/*,.mp4,.m4v,.mov,.mkv,.webm,.avi';

/** Choose a video and title; the upload then continues in the background (uploads panel). */
export function VideoUploadModal({
  open,
  onOpenChange,
  sessionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}) {
  const { t } = useTranslation();
  const { start, canCompress, canUploadInBackground } = useUploads();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [compress, setCompress] = useState(true);

  const close = () => {
    setFile(null);
    setTitle('');
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={t('videos.upload')}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!file || !title.trim()}
            onClick={() => {
              start({ sessionId, title: title.trim(), file: file!, compress });
              close();
            }}
          >
            {t('common.upload')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary-soft/40"
        >
          <Film className="size-8 text-primary" aria-hidden />
          <span className="font-semibold text-text">{t('videos.chooseFile')}</span>
          <span className="text-xs text-secondary">{t('videos.allowed')}</span>
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            const chosen = event.target.files?.[0] ?? null;
            setFile(chosen);
            if (chosen && !title) setTitle(chosen.name.replace(/\.[^.]+$/, ''));
            event.target.value = '';
          }}
        />
        {file && (
          <div className="rounded-lg bg-muted px-4 py-3 text-sm">
            <p className="font-semibold text-text">{file.name}</p>
            <p className="text-secondary ltr-nums">{t('files.size', { size: formatBytes(file.size) })}</p>
          </div>
        )}
        <Field label={t('videos.title')} required>
          {(field) => <Input {...field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />}
        </Field>
        {canCompress && (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-[var(--color-primary)]"
              checked={compress}
              onChange={(event) => setCompress(event.target.checked)}
            />
            <span>
              <span className="block text-sm font-semibold text-text">{t('uploads.compress')}</span>
              <span className="block text-xs text-secondary">{t('uploads.compressHint')}</span>
            </span>
          </label>
        )}
        <p className="flex items-start gap-2 text-xs text-secondary">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {canUploadInBackground ? t('uploads.backgroundInfo') : t('uploads.keepOpenInfo')}
        </p>
      </div>
    </Modal>
  );
}
