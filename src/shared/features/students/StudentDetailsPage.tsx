import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Power, PowerOff, RotateCcw, Smartphone, SmartphoneNfc, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { studentsApi } from '../../api/endpoints/people';
import type { StudentDetails } from '../../api/types';
import { useAuth } from '../../auth/auth-context';
import { runAction } from '../../lib/actions';
import { formatDate, formatDateTime } from '../../lib/format';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { ActionsMenu, Tabs } from '../../ui/controls';
import { QueryView } from '../../ui/data-table';
import { Badge, Card, CardHeader, DetailList, PageHeader } from '../../ui/display';
import { EmptyState } from '../../ui/feedback';
import { ConfirmDialog } from '../../ui/overlay';
import { StudentAccessPanel } from '../access/StudentAccessPanel';
import { ResetPasswordModal } from './ResetPasswordModal';
import { StudentActivityPanel } from './StudentActivityPanel';
import { StudentFormModal } from './StudentFormModal';
import { StudentStatusBadges } from './StudentsPage';

type Dialog = 'edit' | 'password' | 'disable' | 'archive' | 'resetDevice' | null;

function DeviceCard({ student, onReset }: { student: StudentDetails; onReset?: () => void }) {
  const { t } = useTranslation();
  const device = student.device;
  return (
    <Card>
      <CardHeader
        title={t('students.device')}
        actions={
          device && onReset ? (
            <Button variant="outline" size="sm" icon={<SmartphoneNfc className="size-4" />} onClick={onReset}>
              {t('students.resetDevice')}
            </Button>
          ) : undefined
        }
      />
      <div className="p-5">
        {device ? (
          <DetailList
            items={[
              {
                label: t('students.devicePlatform'),
                value: device.platform === 'ANDROID' ? 'Android' : 'iOS',
              },
              { label: t('students.deviceModel'), value: device.model ?? '—' },
              {
                label: t('students.appVersion'),
                value: <span className="ltr-nums">{device.appVersion ?? '—'}</span>,
              },
              {
                label: t('students.boundAt'),
                value: formatDateTime(device.firstSeenAt),
              },
              {
                label: t('students.lastSeen'),
                value: formatDateTime(device.lastSeenAt),
              },
            ]}
          />
        ) : (
          <p className="flex items-center gap-2 text-sm text-secondary">
            <Smartphone className="size-4" aria-hidden /> {t('students.noDevice')}
          </p>
        )}
      </div>
    </Card>
  );
}

function OpenedContent({ student }: { student: StudentDetails }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title={t('students.openedSubjects')} />
        {student.openedSubjects.length === 0 ? (
          <EmptyState title={t('students.noOpened')} />
        ) : (
          <ul className="divide-y divide-border">
            {student.openedSubjects.map((subject) => (
              <li key={subject.subjectId} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-semibold">{subject.name}</span>
                <span className="text-secondary">{subject.gradeName}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardHeader title={t('students.openedTeachers')} />
        {student.openedTeachers.length === 0 ? (
          <EmptyState title={t('students.noOpened')} />
        ) : (
          <ul className="divide-y divide-border">
            {student.openedTeachers.map((teacher) => (
              <li key={teacher.subjectTeacherId} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-semibold">{teacher.teacherName}</span>
                <span className="text-secondary">{teacher.subjectName}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Student page (spec §42): profile, device, opened content, access management, activity. */
export function StudentDetailsPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const api = useApi();
  const students = studentsApi(api);
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('profile');
  const [dialog, setDialog] = useState<Dialog>(null);
  const student = useQuery({
    queryKey: ['student', id],
    queryFn: () => students.get(id),
  });

  const apply = (updated: StudentDetails) => {
    queryClient.setQueryData(['student', id], updated);
    void queryClient.invalidateQueries({ queryKey: ['students'] });
  };
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <QueryView query={student}>
      {(data) => (
        <>
          <PageHeader
            breadcrumbs={[{ label: t('students.title'), to: '/students' }, { label: data.name }]}
            title={data.name}
            subtitle={data.phone}
            actions={
              <>
                <StudentStatusBadges status={data.status} archived={data.archived} />
                <Button variant="outline" icon={<Pencil className="size-4" />} onClick={() => setDialog('edit')}>
                  {t('common.edit')}
                </Button>
                <ActionsMenu
                  actions={[
                    {
                      label: t('students.resetPassword'),
                      icon: <KeyRound className="size-4" />,
                      onSelect: () => setDialog('password'),
                    },
                    {
                      label: data.status === 'ACTIVE' ? t('students.disable') : t('students.enable'),
                      icon: data.status === 'ACTIVE' ? <PowerOff className="size-4" /> : <Power className="size-4" />,
                      tone: data.status === 'ACTIVE' ? 'danger' : 'default',
                      onSelect: () =>
                        data.status === 'ACTIVE'
                          ? setDialog('disable')
                          : runAction(() => students.enable(id), t('common.saved'), apply),
                    },
                    {
                      label: t('students.resetDevice'),
                      icon: <SmartphoneNfc className="size-4" />,
                      hidden: !can('device.reset') || !data.device,
                      onSelect: () => setDialog('resetDevice'),
                    },
                    {
                      label: data.archived ? t('common.restore') : t('common.archive'),
                      icon: data.archived ? <RotateCcw className="size-4" /> : <Trash2 className="size-4" />,
                      tone: data.archived ? 'default' : 'danger',
                      onSelect: () =>
                        data.archived
                          ? runAction(() => students.restore(id), t('common.saved'), apply)
                          : setDialog('archive'),
                    },
                  ]}
                />
              </>
            }
          />

          <Tabs
            value={tab}
            onValueChange={setTab}
            tabs={[
              {
                value: 'profile',
                label: t('students.tabs.profile'),
                content: (
                  <div className="flex flex-col gap-4">
                    <Card className="p-5">
                      <DetailList
                        items={[
                          { label: t('common.name'), value: data.name },
                          {
                            label: t('common.phone'),
                            value: <span className="ltr-nums">{data.phone}</span>,
                          },
                          {
                            label: t('students.grade'),
                            value: data.grade?.name ?? '—',
                          },
                          {
                            label: t('common.status'),
                            value: <StudentStatusBadges status={data.status} archived={data.archived} />,
                          },
                          {
                            label: t('common.createdAt'),
                            value: formatDate(data.createdAt),
                          },
                          {
                            label: t('students.lastLogin'),
                            value: data.lastLoginAt ? formatDateTime(data.lastLoginAt) : t('students.neverLoggedIn'),
                          },
                          {
                            label: t('students.source'),
                            value:
                              data.source === 'SELF_REGISTERED' ? t('students.sourceSelf') : t('students.sourceStaff'),
                          },
                          {
                            label: t('students.activeSessions'),
                            value: <Badge>{data.activeSessions}</Badge>,
                          },
                          ...(data.notes
                            ? [
                                {
                                  label: t('students.notes'),
                                  value: data.notes,
                                },
                              ]
                            : []),
                        ]}
                      />
                    </Card>
                    <DeviceCard
                      student={data}
                      onReset={can('device.reset') ? () => setDialog('resetDevice') : undefined}
                    />
                    <OpenedContent student={data} />
                  </div>
                ),
              },
              {
                value: 'access',
                label: t('students.tabs.access'),
                content: <StudentAccessPanel studentId={id} />,
              },
              ...(can('student.activity')
                ? [
                    {
                      value: 'activity',
                      label: t('students.tabs.activity'),
                      content: <StudentActivityPanel studentId={id} />,
                    },
                  ]
                : []),
            ]}
          />

          <StudentFormModal open={dialog === 'edit'} onOpenChange={close} student={data} onSaved={apply} />
          <ResetPasswordModal
            open={dialog === 'password'}
            onOpenChange={close}
            title={t('students.resetPassword')}
            successMessage={t('students.resetPasswordDone')}
            onSubmit={(password) => students.resetPassword(id, password)}
          />
          <ConfirmDialog
            open={dialog === 'disable'}
            onOpenChange={close}
            title={t('students.disable')}
            body={t('students.disableConfirm')}
            confirmLabel={t('students.disable')}
            onConfirm={() => students.disable(id).then(apply)}
          />
          <ConfirmDialog
            open={dialog === 'archive'}
            onOpenChange={close}
            title={t('common.archive')}
            body={t('students.archiveConfirm')}
            confirmLabel={t('common.archive')}
            onConfirm={() => students.archive(id).then(apply)}
          />
          <ConfirmDialog
            open={dialog === 'resetDevice'}
            onOpenChange={close}
            title={t('students.resetDeviceTitle')}
            body={t('students.resetDeviceBody')}
            confirmLabel={t('students.resetDevice')}
            successMessage={t('students.resetDeviceDone')}
            onConfirm={() => students.resetDevice(id).then(apply)}
          />
        </>
      )}
    </QueryView>
  );
}
