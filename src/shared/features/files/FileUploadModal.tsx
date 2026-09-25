import { useMutation } from '@tanstack/react-query';
import { FileUp } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { filesApi } from '../../api/endpoints/media';
import { errorMessage } from '../../api/errors';
import type { FileScope } from '../../api/types';
import { formatBytes } from '../../lib/format';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { ProgressBar } from '../../ui/feedback';
import { Field, Input } from '../../ui/form';
import { Modal } from '../../ui/overlay';

const ACCEPT = '.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.png,.jpg,.jpeg,.webp,.gif';

/** Choose file → shows name and size → optional title → upload with progress. */
export function FileUploadModal({
  open,
  onOpenChange,
  scope,
  parentId,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: FileScope;
  parentId: string;
  onUploaded: () => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [percent, setPercent] = useState(0);

  const reset = () => {
    setFile(null);
    setTitle('');
    setPercent(0);
  };

  const upload = useMutation({
    mutationFn: () =>
      filesApi(api).upload(scope, parentId, file!, title.trim() || null, (event) => {
        if (event.total) setPercent((event.loaded / event.total) * 100);
      }),
    onSuccess: () => {
      toast.success(t('files.uploaded'));
      onUploaded();
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      setPercent(0);
      toast.error(errorMessage(error));
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (upload.isPending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t('files.upload')}
      footer={
        <>
          <Button variant="outline" disabled={upload.isPending} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!file} loading={upload.isPending} onClick={() => upload.mutate()}>
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
          <FileUp className="size-8 text-primary" aria-hidden />
          <span className="font-semibold text-text">{t('files.chooseFile')}</span>
          <span className="text-xs text-secondary">{t('files.allowed')}</span>
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
        <Field label={t('files.title')} hint={t('files.titleHint')} optional>
          {(field) => <Input {...field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />}
        </Field>
        {upload.isPending && (
          <ProgressBar value={percent} label={t('videos.uploading', { percent: Math.floor(percent) })} />
        )}
      </div>
    </Modal>
  );
}
