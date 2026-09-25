import { FileUp, Info } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FileScope } from '../../api/types';
import { formatBytes } from '../../lib/format';
import { Button } from '../../ui/button';
import { Field, Input } from '../../ui/form';
import { Modal } from '../../ui/overlay';
import { useUploads } from '../uploads/upload-manager';

const ACCEPT = '.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.png,.jpg,.jpeg,.webp,.gif';

/**
 * Choose file → shows name and size → optional title → the upload continues in the uploads panel
 * (made smaller first when that helps; in the background when the browser allows it).
 */
export function FileUploadModal({
  open,
  onOpenChange,
  scope,
  parentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: FileScope;
  parentId: string;
}) {
  const { t } = useTranslation();
  const { startFile, canUploadInBackground } = useUploads();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');

  const close = () => {
    setFile(null);
    setTitle('');
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={t('files.upload')}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!file}
            onClick={() => {
              startFile({ scope, parentId, title: title.trim() || null, file: file! });
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
        <p className="flex items-start gap-2 text-xs text-secondary">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {canUploadInBackground ? t('uploads.backgroundInfo') : t('uploads.keepOpenInfo')}
        </p>
      </div>
    </Modal>
  );
}
