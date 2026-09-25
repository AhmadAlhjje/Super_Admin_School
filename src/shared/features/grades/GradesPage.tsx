import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { gradesApi } from '../../api/endpoints/catalog';
import type { Grade } from '../../api/types';
import { runAction } from '../../lib/actions';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { ActionsMenu, moveItem, ReorderButtons } from '../../ui/controls';
import { DataTable, type Column } from '../../ui/data-table';
import { Badge, Card, PageHeader } from '../../ui/display';
import { ConfirmDialog } from '../../ui/overlay';
import { ArchiveToggle } from '../catalog/ArchiveToggle';
import { NameDescriptionModal } from '../catalog/NameDescriptionModal';

/** Grades: create, rename, archive/restore and reorder (spec §46, §114). */
export function GradesPage() {
  const { t } = useTranslation();
  const api = useApi();
  const grades = gradesApi(api);
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Grade | 'new' | null>(null);
  const [archiving, setArchiving] = useState<Grade | null>(null);
  const status = showArchived ? 'all' : 'active';
  const list = useQuery({
    queryKey: ['grades', status],
    queryFn: () => grades.list({ status }),
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['grades'] });

  const active = list.data?.filter((grade) => !grade.archivedAt) ?? [];
  const move = (from: number, to: number) => {
    const ids = moveItem(active, from, to).map((grade) => grade.id);
    runAction(() => grades.reorder(ids), undefined, refresh);
  };

  const columns: Column<Grade>[] = [
    {
      key: 'order',
      header: '',
      className: 'w-20',
      cell: (row) =>
        row.archivedAt ? null : <ReorderButtons index={active.indexOf(row)} count={active.length} onMove={move} />,
    },
    {
      key: 'name',
      header: t('common.name'),
      cell: (row) => (
        <div>
          <Link to={`/content?grade=${row.id}`} className="font-semibold text-text hover:text-primary">
            {row.name}
          </Link>
          {row.description && <p className="text-xs text-secondary">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'subjects',
      header: t('subjects.title'),
      cell: (row) => t('grades.subjectsCount', { count: row.subjectsCount ?? 0 }),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (row) =>
        row.archivedAt ? (
          <Badge>{t('common.archivedBadge')}</Badge>
        ) : (
          <Badge tone="success">{t('common.active')}</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      cell: (row) => (
        <ActionsMenu
          actions={[
            {
              label: t('common.edit'),
              icon: <Pencil className="size-4" />,
              onSelect: () => setEditing(row),
            },
            row.archivedAt
              ? {
                  label: t('common.restore'),
                  icon: <ArchiveRestore className="size-4" />,
                  onSelect: () => runAction(() => grades.restore(row.id), t('common.saved'), refresh),
                }
              : {
                  label: t('common.archive'),
                  icon: <Archive className="size-4" />,
                  tone: 'danger',
                  onSelect: () => setArchiving(row),
                },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('grades.title')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            {t('grades.add')}
          </Button>
        }
      />
      <Card>
        <div className="flex items-center justify-end border-b border-border px-4 py-3">
          <ArchiveToggle checked={showArchived} onChange={setShowArchived} />
        </div>
        <DataTable
          columns={columns}
          rows={list.data}
          rowKey={(row) => row.id}
          loading={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
          rowClassName={(row) => (row.archivedAt ? 'opacity-60' : undefined)}
          empty={{
            title: t('grades.empty'),
            action: (
              <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
                {t('grades.add')}
              </Button>
            ),
          }}
        />
      </Card>
      <NameDescriptionModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === 'new' ? t('grades.add') : t('grades.edit')}
        nameLabel={t('common.name')}
        initial={editing && editing !== 'new' ? editing : undefined}
        successMessage={editing === 'new' ? t('grades.created') : undefined}
        onSubmit={(values) =>
          (editing && editing !== 'new' ? grades.update(editing.id, values) : grades.create(values)).then(refresh)
        }
      />
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`${t('common.archive')}: ${archiving?.name ?? ''}`}
        body={t('grades.archiveConfirm')}
        confirmLabel={t('common.archive')}
        onConfirm={() => grades.archive(archiving!.id).then(refresh)}
      />
    </>
  );
}
