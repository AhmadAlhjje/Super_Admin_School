import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { teachersApi } from '../../api/endpoints/catalog';
import type { Teacher, TeacherDetails } from '../../api/types';
import { useListParams } from '../../hooks/use-list-params';
import { runAction } from '../../lib/actions';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { ActionsMenu, SearchInput } from '../../ui/controls';
import { DataTable, Pagination, type Column } from '../../ui/data-table';
import { Avatar, Badge, Card, PageHeader } from '../../ui/display';
import { Select } from '../../ui/form';
import { ConfirmDialog } from '../../ui/overlay';
import { TeacherFormModal } from './TeacherFormModal';

const DEFAULTS = { search: '', status: 'active' };

/** Teachers (spec §48). Teachers have no account; the owner manages them and their content. */
export function TeachersPage() {
  const { t } = useTranslation();
  const api = useApi();
  const teachers = teachersApi(api);
  const queryClient = useQueryClient();
  const [params, setParams] = useListParams(DEFAULTS);
  const [editing, setEditing] = useState<TeacherDetails | 'new' | null>(null);
  const [archiving, setArchiving] = useState<Teacher | null>(null);

  const query = {
    page: params.page,
    limit: 20,
    search: params.search || undefined,
    status: params.status as 'active' | 'all',
  };
  const list = useQuery({
    queryKey: ['teachers', query],
    queryFn: () => teachers.list(query),
    placeholderData: keepPreviousData,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['teachers'] });
  const openEditor = (row: Teacher) => runAction(() => teachers.get(row.id), undefined, setEditing);

  const columns: Column<Teacher>[] = [
    {
      key: 'name',
      header: t('common.name'),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} src={row.imageUrl ? `${api.baseUrl}${row.imageUrl}` : null} size="sm" />
          <div>
            <p className="font-semibold text-text">{row.name}</p>
            {row.phone && <p className="text-xs text-secondary ltr-nums">{row.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'subjects',
      header: t('teachers.subjects'),
      hideBelow: 'md',
      cell: (row) =>
        row.subjects.length === 0 ? (
          <span className="text-xs text-secondary">{t('teachers.noSubjects')}</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {row.subjects.map((subject) => (
              <Badge key={subject.subjectTeacherId} tone="primary">
                {subject.subjectName} · {subject.gradeName}
              </Badge>
            ))}
          </span>
        ),
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
                label: t('common.edit'),
                icon: <Pencil className="size-4" />,
                onSelect: () => openEditor(row),
              },
              row.archivedAt
                ? {
                    label: t('common.restore'),
                    icon: <ArchiveRestore className="size-4" />,
                    onSelect: () => runAction(() => teachers.restore(row.id), t('common.saved'), refresh),
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
        title={t('teachers.title')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            {t('teachers.add')}
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search}
            onChange={(search) => setParams({ search })}
            placeholder={t('teachers.searchPlaceholder')}
          />
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
          onRowClick={openEditor}
          rowClassName={(row) => (row.archivedAt ? 'opacity-60' : undefined)}
          empty={{
            title: params.search ? t('common.noResults') : t('teachers.empty'),
            action: !params.search ? (
              <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
                {t('teachers.add')}
              </Button>
            ) : undefined,
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
      <TeacherFormModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        teacher={editing && editing !== 'new' ? editing : undefined}
      />
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`${t('common.archive')}: ${archiving?.name ?? ''}`}
        body={t('teachers.archiveConfirm')}
        confirmLabel={t('common.archive')}
        onConfirm={() => teachers.archive(archiving!.id).then(refresh)}
      />
    </>
  );
}
