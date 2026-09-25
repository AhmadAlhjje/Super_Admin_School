import {
  adminApi,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  formatDateTime,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  useApi,
  useListParams,
  type Column,
  type DeviceRow,
} from '../../shared';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { SmartphoneNfc } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

const DEFAULTS = { search: '', status: 'ACTIVE' };

/** Device bindings with super-admin reset (spec §16–17, §43). */
export function DevicesPage() {
  const { t } = useTranslation();
  const api = useApi();
  const queryClient = useQueryClient();
  const [params, setParams] = useListParams(DEFAULTS);
  const [resetting, setResetting] = useState<DeviceRow | null>(null);
  const query = {
    page: params.page,
    search: params.search || undefined,
    status: params.status as 'ACTIVE' | 'RESET' | 'all',
  };
  const devices = useQuery({
    queryKey: ['devices', query],
    queryFn: () => adminApi(api).devices(query),
    placeholderData: keepPreviousData,
  });

  const columns: Column<DeviceRow>[] = [
    {
      key: 'student',
      header: t('devices.student'),
      cell: (row) => (
        <Link to={`/students/${row.student.id}`} className="hover:text-primary">
          <p className="font-semibold">{row.student.name}</p>
          <p className="text-xs text-secondary ltr-nums">{row.student.phone}</p>
        </Link>
      ),
    },
    {
      key: 'device',
      header: t('devices.model'),
      cell: (row) => (
        <div>
          <p>{row.model ?? '—'}</p>
          <p className="text-xs text-secondary">
            {row.platform === 'ANDROID' ? 'Android' : 'iOS'} {row.osVersion ?? ''}
          </p>
        </div>
      ),
    },
    {
      key: 'app',
      header: t('devices.appVersion'),
      hideBelow: 'lg',
      cell: (row) => <span className="ltr-nums">{row.appVersion ?? '—'}</span>,
    },
    { key: 'first', header: t('devices.firstSeen'), hideBelow: 'md', cell: (row) => formatDateTime(row.firstSeenAt) },
    { key: 'last', header: t('devices.lastSeen'), hideBelow: 'lg', cell: (row) => formatDateTime(row.lastSeenAt) },
    {
      key: 'status',
      header: t('common.status'),
      cell: (row) => (
        <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{t(`devices.statuses.${row.status}`)}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) =>
        row.status === 'ACTIVE' ? (
          <Button
            variant="outline"
            size="sm"
            icon={<SmartphoneNfc className="size-4" />}
            onClick={() => setResetting(row)}
          >
            {t('devices.reset')}
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader title={t('devices.title')} subtitle={t('devices.subtitle')} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search}
            onChange={(search) => setParams({ search })}
            placeholder={t('devices.searchPlaceholder')}
          />
          <Select
            aria-label={t('common.status')}
            className="w-auto"
            value={params.status}
            onChange={(e) => setParams({ status: e.target.value })}
          >
            <option value="ACTIVE">{t('devices.statuses.ACTIVE')}</option>
            <option value="RESET">{t('devices.statuses.RESET')}</option>
            <option value="all">{t('common.all')}</option>
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={devices.data?.items}
          rowKey={(row) => row.id}
          loading={devices.isPending}
          error={devices.error}
          onRetry={() => void devices.refetch()}
          empty={{ title: t('devices.empty') }}
        />
        {devices.data && (
          <Pagination
            page={devices.data.page}
            totalPages={devices.data.totalPages}
            total={devices.data.total}
            onPageChange={(page) => setParams({ page })}
          />
        )}
      </Card>
      <ConfirmDialog
        open={resetting !== null}
        onOpenChange={(open) => !open && setResetting(null)}
        title={t('students.resetDeviceTitle')}
        body={`${resetting?.student.name ?? ''} — ${t('students.resetDeviceBody')}`}
        confirmLabel={t('students.resetDevice')}
        successMessage={t('students.resetDeviceDone')}
        onConfirm={() =>
          adminApi(api)
            .resetDevice(resetting!.id)
            .then(() => queryClient.invalidateQueries({ queryKey: ['devices'] }))
        }
      />
    </>
  );
}
