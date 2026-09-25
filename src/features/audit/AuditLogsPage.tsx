import {
  adminApi,
  Badge,
  Card,
  DataTable,
  formatDateTime,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  translateKey,
  useApi,
  useListParams,
  type AuditLogRow,
  type Column,
} from '../../shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULTS = { action: '', from: '', to: '' };

/** Read-only audit trail (spec §55, §93): filter by action and date range. */
export function AuditLogsPage() {
  const { t } = useTranslation();
  const api = useApi();
  const [params, setParams] = useListParams(DEFAULTS);
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const actions = useQuery({
    queryKey: ['audit-actions'],
    queryFn: () => adminApi(api).auditActions(),
    staleTime: Infinity,
  });
  const query = {
    page: params.page,
    action: params.action || undefined,
    from: params.from ? new Date(`${params.from}T00:00:00`).toISOString() : undefined,
    to: params.to ? new Date(`${params.to}T23:59:59`).toISOString() : undefined,
  };
  const logs = useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => adminApi(api).auditLogs(query),
    placeholderData: keepPreviousData,
  });

  const columns: Column<AuditLogRow>[] = [
    {
      key: 'time',
      header: t('audit.time'),
      cell: (row) => <span className="whitespace-nowrap">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'action',
      header: t('audit.action'),
      cell: (row) => (
        <Badge tone={/FAILED|REJECTED|REUSE/.test(row.action) ? 'danger' : 'primary'}>
          {translateKey(`audit.actions.${row.action}`, row.action)}
        </Badge>
      ),
    },
    {
      key: 'actor',
      header: t('audit.actor'),
      cell: (row) =>
        row.actor ? (
          <div>
            <p className="font-semibold">{row.actor.name}</p>
            <p className="text-xs text-secondary">{t(`roles.${row.actor.role}`)}</p>
          </div>
        ) : (
          <span className="text-secondary">{t('audit.system')}</span>
        ),
    },
    { key: 'entity', header: t('audit.entity'), hideBelow: 'md', cell: (row) => row.entityType ?? '—' },
    {
      key: 'ip',
      header: t('audit.ip'),
      hideBelow: 'lg',
      cell: (row) => <span className="ltr-nums">{row.ipAddress ?? '—'}</span>,
    },
  ];

  return (
    <>
      <PageHeader title={t('audit.title')} subtitle={t('audit.subtitle')} />
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <label className="flex flex-col gap-1 text-xs text-secondary">
            {t('audit.action')}
            <Select className="w-56" value={params.action} onChange={(e) => setParams({ action: e.target.value })}>
              <option value="">{t('audit.allActions')}</option>
              {actions.data?.map((action) => (
                <option key={action} value={action}>
                  {translateKey(`audit.actions.${action}`, action)}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-secondary">
            {t('audit.from')}
            <Input
              type="date"
              className="w-44"
              value={params.from}
              onChange={(e) => setParams({ from: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-secondary">
            {t('audit.to')}
            <Input type="date" className="w-44" value={params.to} onChange={(e) => setParams({ to: e.target.value })} />
          </label>
        </div>
        <DataTable
          columns={columns}
          rows={logs.data?.items}
          rowKey={(row) => row.id}
          loading={logs.isPending}
          error={logs.error}
          onRetry={() => void logs.refetch()}
          onRowClick={setSelected}
          empty={{ title: t('audit.empty') }}
        />
        {logs.data && (
          <Pagination
            page={logs.data.page}
            totalPages={logs.data.totalPages}
            total={logs.data.total}
            onPageChange={(page) => setParams({ page })}
          />
        )}
      </Card>
      <Modal
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected ? translateKey(`audit.actions.${selected.action}`, selected.action) : ''}
        size="lg"
      >
        {selected && (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-secondary">{t('audit.time')}</dt>
              <dd>{formatDateTime(selected.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">{t('audit.actor')}</dt>
              <dd>{selected.actor?.name ?? t('audit.system')}</dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">{t('audit.entity')}</dt>
              <dd className="ltr-nums break-all">
                {selected.entityType ?? '—'} {selected.entityId ?? ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">{t('audit.ip')}</dt>
              <dd className="ltr-nums">{selected.ipAddress ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-secondary">User-Agent</dt>
              <dd className="ltr-nums break-all">{selected.userAgent ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-secondary">{t('audit.details')}</dt>
              <dd>
                <pre dir="ltr" className="mt-1 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {JSON.stringify(selected.metadata ?? {}, null, 2)}
                </pre>
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </>
  );
}
