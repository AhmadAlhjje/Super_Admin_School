import {
  adminApi,
  Badge,
  Card,
  CardHeader,
  formatBytes,
  formatDateTime,
  QueryView,
  SkeletonList,
  translateKey,
  useApi,
} from '../../shared';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, HardDrive, MonitorSmartphone, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** System health for the super admin: storage, devices, sessions, processing jobs, activity (spec §41). */
export function SystemPanel() {
  const { t } = useTranslation();
  const api = useApi();
  const stats = useQuery({
    queryKey: ['system-stats'],
    queryFn: () => adminApi(api).systemStats(),
    refetchInterval: 30_000,
  });

  return (
    <section aria-label={t('dashboard.system')} className="mt-6 flex flex-col gap-6">
      <h2 className="text-lg font-bold">{t('dashboard.system')}</h2>
      <QueryView query={stats} skeleton={<SkeletonList rows={4} />}>
        {(data) => (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="p-5">
                <p className="mb-3 flex items-center gap-2 font-bold">
                  <HardDrive className="size-4 text-primary" aria-hidden /> {t('dashboard.storage')}
                </p>
                <dl className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-secondary">{t('dashboard.videosStorage')}</dt>
                    <dd className="font-semibold ltr-nums">{formatBytes(data.storage.videosBytes)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-secondary">{t('dashboard.filesStorage')}</dt>
                    <dd className="font-semibold ltr-nums">{formatBytes(data.storage.filesBytes)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-secondary">{t('dashboard.diskFree')}</dt>
                    <dd className="font-semibold ltr-nums">
                      {formatBytes(data.storage.diskFreeBytes)} / {formatBytes(data.storage.diskTotalBytes)}
                    </dd>
                  </div>
                </dl>
              </Card>
              <Card className="p-5">
                <p className="mb-3 flex items-center gap-2 font-bold">
                  <MonitorSmartphone className="size-4 text-primary" aria-hidden /> {t('dashboard.activeSessions')}
                </p>
                <dl className="flex flex-col gap-2 text-sm">
                  {(['STUDENT_APP', 'OWNER_WEB', 'ADMIN_WEB'] as const).map((portal) => (
                    <div key={portal} className="flex justify-between">
                      <dt className="text-secondary">{t(`portals.${portal}`)}</dt>
                      <dd className="font-semibold ltr-nums">{data.activeSessions[portal] ?? 0}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-2">
                    <dt className="text-secondary">{t('dashboard.deviceBindings')}</dt>
                    <dd className="font-semibold ltr-nums">{data.activeDeviceBindings}</dd>
                  </div>
                </dl>
              </Card>
              <Card className="p-5">
                <p className="mb-3 flex items-center gap-2 font-bold">
                  <Workflow className="size-4 text-primary" aria-hidden /> {t('dashboard.uploadJobs')}
                </p>
                <dl className="flex flex-col gap-2 text-sm">
                  {(['UPLOADING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'] as const).map((status) => (
                    <div key={status} className="flex justify-between">
                      <dt className="text-secondary">{t(`dashboard.jobStatus.${status}`)}</dt>
                      <dd className="font-semibold ltr-nums">{data.uploadJobs[status] ?? 0}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </div>

            {data.failedJobs.length > 0 && (
              <Card>
                <CardHeader title={t('dashboard.failedJobs')} />
                <ul className="divide-y divide-border">
                  {data.failedJobs.map((job) => (
                    <li key={job.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{job.video.title}</p>
                        <p className="truncate text-xs text-secondary">
                          {job.originalFileName} · {job.errorMessage ?? '—'}
                        </p>
                      </div>
                      <span className="text-xs text-secondary">{formatDateTime(job.updatedAt)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card>
              <CardHeader title={t('dashboard.recentActivity')} />
              <ul className="divide-y divide-border">
                {data.recentActivity.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{translateKey(`audit.actions.${event.action}`, event.action)}</p>
                      <p className="text-xs text-secondary">{event.actor?.name ?? t('audit.system')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.actorRole && <Badge>{t(`roles.${event.actorRole}`)}</Badge>}
                      <span className="text-xs text-secondary">{formatDateTime(event.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </QueryView>
    </section>
  );
}
