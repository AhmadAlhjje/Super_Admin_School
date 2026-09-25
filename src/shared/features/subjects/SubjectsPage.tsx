import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, FolderOpen, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { subjectsApi } from '../../api/endpoints/catalog';
import type { Subject } from '../../api/types';
import { useListParams } from '../../hooks/use-list-params';
import { useGradeOptions } from '../../hooks/use-lookups';
import { runAction } from '../../lib/actions';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { ActionsMenu, SearchInput } from '../../ui/controls';
import { DataTable, Pagination, type Column } from '../../ui/data-table';
import { Badge, Card, PageHeader } from '../../ui/display';
import { Select } from '../../ui/form';
import { ConfirmDialog } from '../../ui/overlay';
import { SubjectFormModal } from './SubjectFormModal';

const DEFAULTS = { search: '', gradeId: '', status: 'active' };

/** Subjects list (spec §47). Opening a subject manages its teachers and content. */
export function SubjectsPage() {
  const { t } = useTranslation();
  const api = useApi();
  const subjects = subjectsApi(api);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const grades = useGradeOptions();
  const [params, setParams] = useListParams(DEFAULTS);
  const [editing, setEditing] = useState<Subject | 'new' | null>(null);
  const [archiving, setArchiving] = useState<Subject | null>(null);

  const query = {
    page: params.page,
    limit: 20,
    search: params.search || undefined,
    gradeId: params.gradeId || undefined,
    status: params.status as 'active' | 'all',
  };
  const list = useQuery({
    queryKey: ['subjects', query],
    queryFn: () => subjects.list(query),
    placeholderData: keepPreviousData,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['subjects'] });

  const columns: Column<Subject>[] = [
    {
      key: 'name',
      header: t('common.name'),
      cell: (row) => (
        <div>
          <p className="font-semibold text-text">{row.name}</p>
          {row.description && <p className="line-clamp-1 text-xs text-secondary">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'grade',
      header: t('subjects.grade'),
      cell: (row) => row.grade?.name ?? '—',
    },
    {
      key: 'teachers',
      header: t('subjects.teachers'),
      cell: (row) => t('subjects.teachersCount', { count: row.teachersCount ?? 0 }),
      hideBelow: 'md',
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
        <span onClick={(event) => event.stopPropagation()}>
          <ActionsMenu
            actions={[
              {
                label: t('nav.content'),
                icon: <FolderOpen className="size-4" />,
                onSelect: () => void navigate(`/content/subjects/${row.id}`),
              },
              {
                label: t('common.edit'),
                icon: <Pencil className="size-4" />,
                onSelect: () => setEditing(row),
              },
              row.archivedAt
                ? {
                    label: t('common.restore'),
                    icon: <ArchiveRestore className="size-4" />,
                    onSelect: () => runAction(() => subjects.restore(row.id), t('common.saved'), refresh),
                  }
                : {
                    label: t('common.archive'),
                    icon: <Archive className="size-4" />,
                    tone: 'danger',
                    onSelect: () => setArchiving(row),
                  },
            ]}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('subjects.title')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            {t('subjects.add')}
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search}
            onChange={(search) => setParams({ search })}
            placeholder={t('common.search')}
          />
          <Select
            aria-label={t('subjects.grade')}
            className="w-auto"
            value={params.gradeId}
            onChange={(e) => setParams({ gradeId: e.target.value })}
          >
            <option value="">{t('subjects.allGrades')}</option>
            {grades.data?.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t('common.status')}
            className="w-auto"
            value={params.status}
            onChange={(e) => setParams({ status: e.target.value })}
          >
            <option value="active">{t('common.active')}</option>
            <option value="all">{t('common.all')}</option>
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={list.data?.items}
          rowKey={(row) => row.id}
          loading={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
          onRowClick={(row) => void navigate(`/content/subjects/${row.id}`)}
          rowClassName={(row) => (row.archivedAt ? 'opacity-60' : undefined)}
          empty={{
            title: params.search ? t('common.noResults') : t('subjects.empty'),
          }}
        />
        {list.data && (
          <Pagination
            page={list.data.page}
            totalPages={list.data.totalPages}
            total={list.data.total}
            onPageChange={(page) => setParams({ page })}
          />
        )}
      </Card>
      <SubjectFormModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        subject={editing && editing !== 'new' ? editing : undefined}
        defaultGradeId={params.gradeId || undefined}
      />
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`${t('common.archive')}: ${archiving?.name ?? ''}`}
        body={t('subjects.archiveConfirm')}
        confirmLabel={t('common.archive')}
        onConfirm={() => subjects.archive(archiving!.id).then(refresh)}
      />
    </>
  );
}
