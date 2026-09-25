import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Pencil,
  Presentation,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { filesApi } from '../../api/endpoints/media';
import type { ContentFile, FileKind, FileScope } from '../../api/types';
import { runAction } from '../../lib/actions';
import { formatBytes, formatDate } from '../../lib/format';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { ActionsMenu, moveItem, ReorderButtons } from '../../ui/controls';
import { QueryView } from '../../ui/data-table';
import { Badge, Card, CardHeader } from '../../ui/display';
import { EmptyState, SkeletonList } from '../../ui/feedback';
import { ConfirmDialog } from '../../ui/overlay';
import { NameDescriptionModal } from '../catalog/NameDescriptionModal';
import { FileUploadModal } from './FileUploadModal';

const KIND_ICONS: Record<FileKind, typeof FileText> = {
  PDF: FileText,
  DOCUMENT: FileText,
  PRESENTATION: Presentation,
  SPREADSHEET: FileSpreadsheet,
  ARCHIVE: FileArchive,
  IMAGE: FileImage,
  OTHER: FileText,
};

/** Files attached at one level (subject / teacher space / topic / session). */
export function FilesSection({ scope, parentId, title }: { scope: FileScope; parentId: string; title: string }) {
  const { t } = useTranslation();
  const api = useApi();
  const files = filesApi(api);
  const queryClient = useQueryClient();
  const queryKey = ['files', scope, parentId];
  const list = useQuery({
    queryKey,
    queryFn: () => files.list(scope, parentId, 'all'),
  });
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState<ContentFile | null>(null);
  const [deleting, setDeleting] = useState<ContentFile | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey });

  const download = (file: ContentFile) =>
    runAction(
      () => files.download(file.id),
      undefined,
      (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${file.title}.${file.extension}`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      },
    );

  return (
    <Card>
      <CardHeader
        title={title}
        actions={
          <Button variant="secondary" size="sm" icon={<Upload className="size-4" />} onClick={() => setUploading(true)}>
            {t('files.upload')}
          </Button>
        }
      />
      <QueryView query={list} skeleton={<SkeletonList rows={2} />}>
        {(data) => {
          const active = data.filter((file) => !file.archivedAt);
          if (data.length === 0) return <EmptyState title={t('content.noFiles')} />;
          return (
            <ul className="divide-y divide-border">
              {data.map((file) => {
                const Icon = KIND_ICONS[file.kind];
                return (
                  <li
                    key={file.id}
                    className={`flex items-center gap-3 px-4 py-3 ${file.archivedAt ? 'opacity-60' : ''}`}
                  >
                    {!file.archivedAt && (
                      <ReorderButtons
                        index={active.indexOf(file)}
                        count={active.length}
                        onMove={(from, to) =>
                          runAction(
                            () =>
                              files.reorder(
                                scope,
                                parentId,
                                moveItem(active, from, to).map((f) => f.id),
                              ),
                            undefined,
                            refresh,
                          )
                        }
                      />
                    )}
                    <Icon className="size-5 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text">{file.title}</p>
                      <p className="text-xs text-secondary">
                        {t(`files.kinds.${file.kind}`)} ·{' '}
                        <span className="ltr-nums">{formatBytes(file.sizeBytes)}</span> · {formatDate(file.createdAt)}
                      </p>
                    </div>
                    {file.archivedAt && <Badge>{t('common.archivedBadge')}</Badge>}
                    <ActionsMenu
                      actions={[
                        {
                          label: t('common.download'),
                          icon: <Download className="size-4" />,
                          onSelect: () => download(file),
                        },
                        {
                          label: t('videos.rename'),
                          icon: <Pencil className="size-4" />,
                          onSelect: () => setRenaming(file),
                        },
                        file.archivedAt
                          ? {
                              label: t('common.restore'),
                              icon: <RotateCcw className="size-4" />,
                              onSelect: () => runAction(() => files.restore(file.id), t('common.saved'), refresh),
                            }
                          : {
                              label: t('common.delete'),
                              icon: <Trash2 className="size-4" />,
                              tone: 'danger',
                              onSelect: () => setDeleting(file),
                            },
                      ]}
                    />
                  </li>
                );
              })}
            </ul>
          );
        }}
      </QueryView>
      <FileUploadModal
        open={uploading}
        onOpenChange={setUploading}
        scope={scope}
        parentId={parentId}
        onUploaded={refresh}
      />
      <NameDescriptionModal
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
        title={t('videos.rename')}
        nameLabel={t('files.title')}
        withDescription={false}
        initial={renaming ? { name: renaming.title, description: null } : undefined}
        onSubmit={(values) => files.update(renaming!.id, values.name).then(refresh)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`${t('common.delete')}: ${deleting?.title ?? ''}`}
        body={t('files.deleteConfirm')}
        confirmLabel={t('common.delete')}
        onConfirm={() => files.archive(deleting!.id).then(refresh)}
      />
    </Card>
  );
}
