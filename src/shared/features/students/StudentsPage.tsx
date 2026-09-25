import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Smartphone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { studentsApi, type StudentListParams } from '../../api/endpoints/people';
import type { StudentListItem } from '../../api/types';
import { useListParams } from '../../hooks/use-list-params';
import { useGradeOptions } from '../../hooks/use-lookups';
import { formatDateTime } from '../../lib/format';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { SearchInput } from '../../ui/controls';
import { DataTable, Pagination, type Column } from '../../ui/data-table';
import { Badge, Card, PageHeader } from '../../ui/display';
import { Select } from '../../ui/form';
import { StudentFormModal } from './StudentFormModal';

const DEFAULTS = {
  search: '',
  accountStatus: 'all',
  lifecycle: 'active',
  gradeId: '',
  sort: 'newest',
};
const SORTS = {
  newest: { sort: 'createdAt', order: 'desc' },
  oldest: { sort: 'createdAt', order: 'asc' },
  name: { sort: 'name', order: 'asc' },
  lastLogin: { sort: 'lastLoginAt', order: 'desc' },
} as const;

export function StudentStatusBadges({ status, archived }: { status: string; archived: boolean }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex flex-wrap gap-1">
      {archived ? (
        <Badge>{t('common.archivedBadge')}</Badge>
      ) : status === 'ACTIVE' ? (
        <Badge tone="success">{t('students.accountActive')}</Badge>
      ) : (
        <Badge tone="danger">{t('students.accountDisabled')}</Badge>
      )}
    </span>
  );
}

/** Students list with search (name/phone), filters, sort and pagination (spec §77). */
export function StudentsPage() {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const grades = useGradeOptions();
  const [params, setParams] = useListParams(DEFAULTS);
  const [creating, setCreating] = useState(false);

  const query: StudentListParams = useMemo(() => {
    const sort = SORTS[params.sort as keyof typeof SORTS] ?? SORTS.newest;
    return {
      page: params.page,
      limit: 20,
      search: params.search || undefined,
      accountStatus: params.accountStatus as StudentListParams['accountStatus'],
      lifecycle: params.lifecycle as StudentListParams['lifecycle'],
      gradeId: params.gradeId || undefined,
      sort: sort.sort,
      order: sort.order,
    };
  }, [params]);

  const students = useQuery({
    queryKey: ['students', query],
    queryFn: () => studentsApi(api).list(query),
    placeholderData: keepPreviousData,
  });

  const columns: Column<StudentListItem>[] = [
    {
      key: 'name',
      header: t('common.name'),
      cell: (row) => (
        <div>
          <p className="font-semibold text-text">{row.name}</p>
          <p className="text-xs text-secondary ltr-nums">{row.phone}</p>
        </div>
      ),
    },
    {
      key: 'grade',
      header: t('students.grade'),
      cell: (row) => row.grade?.name ?? '—',
      hideBelow: 'md',
    },
    {
      key: 'device',
      header: t('students.device'),
      hideBelow: 'lg',
      cell: (row) =>
        row.device ? (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Smartphone className="size-4 text-secondary" aria-hidden />
            {row.device.model ?? row.device.platform}
          </span>
        ) : (
          <span className="text-xs text-secondary">{t('students.noDevice')}</span>
        ),
    },
    {
      key: 'opened',
      header: t('students.openedSubjects'),
      hideBelow: 'md',
      cell: (row) => <span className="ltr-nums">{`${row.openSubjectsCount} / ${row.openTeachersCount}`}</span>,
    },
    {
      key: 'lastLogin',
      header: t('students.lastLogin'),
      hideBelow: 'lg',
      cell: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt) : t('students.neverLoggedIn')),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (row) => <StudentStatusBadges status={row.status} archived={row.archived} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={t('students.title')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            {t('students.add')}
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search}
            onChange={(search) => setParams({ search })}
            placeholder={t('students.searchPlaceholder')}
          />
          <Select
            aria-label={t('common.status')}
            className="w-auto"
            value={params.accountStatus}
            onChange={(e) => setParams({ accountStatus: e.target.value })}
          >
            <option value="all">{t('students.allStatuses')}</option>
            <option value="ACTIVE">{t('students.accountActive')}</option>
            <option value="DISABLED">{t('students.accountDisabled')}</option>
          </Select>
          <Select
            aria-label={t('students.grade')}
            className="w-auto"
            value={params.gradeId}
            onChange={(e) => setParams({ gradeId: e.target.value })}
          >
            <option value="">{t('students.allGrades')}</option>
            {grades.data?.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t('common.all')}
            className="w-auto"
            value={params.lifecycle}
            onChange={(e) => setParams({ lifecycle: e.target.value })}
          >
            <option value="active">{t('common.active')}</option>
            <option value="archived">{t('common.archived')}</option>
            <option value="all">{t('common.all')}</option>
          </Select>
          <Select
            aria-label={t('students.sort.newest')}
            className="w-auto"
            value={params.sort}
            onChange={(e) => setParams({ sort: e.target.value })}
          >
            {Object.keys(SORTS).map((key) => (
              <option key={key} value={key}>
                {t(`students.sort.${key as keyof typeof SORTS}`)}
              </option>
            ))}
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={students.data?.items}
          rowKey={(row) => row.id}
          loading={students.isPending}
          error={students.error}
          onRetry={() => void students.refetch()}
          onRowClick={(row) => void navigate(`/students/${row.id}`)}
          empty={{
            title: params.search ? t('common.noResults') : t('students.empty'),
            action: !params.search ? (
              <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                {t('students.add')}
              </Button>
            ) : undefined,
          }}
        />
        {students.data && (
          <Pagination
            page={students.data.page}
            totalPages={students.data.totalPages}
            total={students.data.total}
            onPageChange={(page) => setParams({ page })}
          />
        )}
      </Card>
      <StudentFormModal
        open={creating}
        onOpenChange={setCreating}
        onSaved={(student) => void navigate(`/students/${student.id}`)}
      />
    </>
  );
}
