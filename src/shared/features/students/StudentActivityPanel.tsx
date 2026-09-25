import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { studentsApi } from '../../api/endpoints/people';
import { formatDateTime } from '../../lib/format';
import { translateKey } from '../../lib/translate';
import { useApi } from '../../platform/platform-context';
import { QueryView } from '../../ui/data-table';
import { Badge, Card, CardHeader } from '../../ui/display';
import { EmptyState } from '../../ui/feedback';

/** Login sessions and audit trail for one student (super admin). */
export function StudentActivityPanel({ studentId }: { studentId: string }) {
  const { t } = useTranslation();
  const api = useApi();
  const activity = useQuery({
    queryKey: ['student', studentId, 'activity'],
    queryFn: () => studentsApi(api).activity(studentId),
  });

  return (
    <QueryView query={activity}>
      {(data) => (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader title={t('students.activity.sessions')} />
            {data.sessions.length === 0 ? (
              <EmptyState title={t('students.activity.noSessions')} />
            ) : (
              <ul className="divide-y divide-border">
                {data.sessions.map((session) => (
                  <li key={session.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{formatDateTime(session.createdAt)}</p>
                      <p className="text-xs text-secondary ltr-nums">{session.ipAddress ?? '—'}</p>
                    </div>
                    {session.revokedAt ? (
                      <Badge>{t('students.activity.revoked')}</Badge>
                    ) : (
                      <Badge tone="success">{t('students.activity.live')}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title={t('students.activity.events')} />
            {data.events.length === 0 ? (
              <EmptyState title={t('students.activity.noEvents')} />
            ) : (
              <ul className="divide-y divide-border">
                {data.events.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{translateKey(`audit.actions.${event.action}`, event.action)}</p>
                      <p className="text-xs text-secondary">{event.actor?.name ?? t('audit.system')}</p>
                    </div>
                    <span className="text-xs text-secondary">{formatDateTime(event.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </QueryView>
  );
}
