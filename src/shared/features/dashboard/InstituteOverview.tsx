import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileText, Layers, PlayCircle, UploadCloud, Users, UserSquare2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { dashboardApi } from '../../api/endpoints/people';
import { useAuth } from '../../auth/auth-context';
import { formatDate, formatNumber } from '../../lib/format';
import { useApi } from '../../platform/platform-context';
import { QueryView } from '../../ui/data-table';
import { Badge, Card, CardHeader, PageHeader, StatCard } from '../../ui/display';
import { EmptyState, Skeleton } from '../../ui/feedback';
import { VideoStatusBadge } from '../videos/VideoStatusBadge';
import { UploadsChart } from './UploadsChart';

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-24" />
      ))}
    </div>
  );
}

/** Institute overview used by both dashboards. */
export function InstituteOverview() {
  const { t } = useTranslation();
  const api = useApi();
  const { user } = useAuth();
  const stats = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi(api).stats(),
  });

  return (
    <>
      <PageHeader title={t('dashboard.welcome', { name: user?.name ?? '' })} subtitle={t('dashboard.title')} />
      <QueryView query={stats} skeleton={<OverviewSkeleton />}>
        {(data) => (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={t('dashboard.students')}
                value={formatNumber(data.counts.students)}
                hint={
                  data.counts.disabledStudents
                    ? t('dashboard.disabledStudents', {
                        count: data.counts.disabledStudents,
                      })
                    : undefined
                }
                icon={<Users className="size-5" />}
              />
              <StatCard
                label={t('dashboard.teachers')}
                value={formatNumber(data.counts.teachers)}
                icon={<UserSquare2 className="size-5" />}
              />
              <StatCard
                label={t('dashboard.subjects')}
                value={formatNumber(data.counts.subjects)}
                icon={<BookOpen className="size-5" />}
              />
              <StatCard
                label={t('dashboard.grades')}
                value={formatNumber(data.counts.grades)}
                icon={<Layers className="size-5" />}
              />
              <StatCard
                label={t('dashboard.videos')}
                tone="success"
                value={formatNumber(data.counts.videos)}
                icon={<PlayCircle className="size-5" />}
              />
              <StatCard
                label={t('dashboard.videosInProgress')}
                tone="warning"
                value={formatNumber(data.counts.videosInProgress)}
                icon={<UploadCloud className="size-5" />}
              />
              <StatCard
                label={t('dashboard.files')}
                value={formatNumber(data.counts.files)}
                icon={<FileText className="size-5" />}
              />
            </div>

            <Card>
              <CardHeader title={t('dashboard.uploadsChart')} />
              <div className="p-4">
                <UploadsChart data={data.uploadsPerDay} />
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader title={t('dashboard.recentVideos')} />
                {data.recentVideos.length === 0 ? (
                  <EmptyState title={t('dashboard.noVideos')} />
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recentVideos.map((video) => (
                      <li key={video.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <Link to={`/content/sessions/${video.sessionId}`} className="min-w-0 hover:text-primary">
                          <p className="truncate text-sm font-semibold">{video.title}</p>
                          <p className="truncate text-xs text-secondary">
                            {video.topicTitle} · {video.sessionTitle}
                          </p>
                        </Link>
                        <VideoStatusBadge status={video.displayStatus} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <CardHeader title={t('dashboard.recentStudents')} />
                {data.recentStudents.length === 0 ? (
                  <EmptyState title={t('dashboard.noStudents')} />
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recentStudents.map((student) => (
                      <li key={student.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <Link to={`/students/${student.id}`} className="min-w-0 hover:text-primary">
                          <p className="truncate text-sm font-semibold">{student.name}</p>
                          <p className="text-xs text-secondary ltr-nums">{student.phone}</p>
                        </Link>
                        <div className="flex items-center gap-2">
                          {student.status === 'DISABLED' && (
                            <Badge tone="danger">{t('students.accountDisabled')}</Badge>
                          )}
                          <span className="text-xs text-secondary">{formatDate(student.createdAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}
      </QueryView>
    </>
  );
}
