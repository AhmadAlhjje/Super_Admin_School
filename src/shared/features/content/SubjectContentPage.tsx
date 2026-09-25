import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, ChevronLeft, ChevronRight, Pencil, Unlink, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { subjectsApi, subjectTeachersApi } from '../../api/endpoints/catalog';
import { errorMessage } from '../../api/errors';
import type { SubjectTeacherRow } from '../../api/types';
import { useTeacherOptions } from '../../hooks/use-lookups';
import { runAction } from '../../lib/actions';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { ActionsMenu, moveItem, ReorderButtons } from '../../ui/controls';
import { QueryView } from '../../ui/data-table';
import { Avatar, Badge, Card, CardHeader, PageHeader } from '../../ui/display';
import { EmptyState } from '../../ui/feedback';
import { Field, Select } from '../../ui/form';
import { ConfirmDialog, Modal } from '../../ui/overlay';
import { FilesSection } from '../files/FilesSection';
import { SubjectFormModal } from '../subjects/SubjectFormModal';

function AssignTeacherModal({
  open,
  onOpenChange,
  subjectId,
  assignedIds,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  assignedIds: string[];
  onAssigned: () => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const teachers = useTeacherOptions();
  const [teacherId, setTeacherId] = useState('');
  const available = teachers.data?.filter((teacher) => !assignedIds.includes(teacher.id)) ?? [];
  const assign = useMutation({
    mutationFn: () => subjectsApi(api).assignTeacher(subjectId, teacherId),
    onSuccess: () => {
      toast.success(t('common.saved'));
      onAssigned();
      setTeacherId('');
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('subjects.assignTeacher')}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!teacherId} loading={assign.isPending} onClick={() => assign.mutate()}>
            {t('subjects.assignTeacher')}
          </Button>
        </>
      }
    >
      <Field label={t('subjects.selectTeacher')} required>
        {(field) => (
          <Select {...field} value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
            <option value="">{t('common.select')}</option>
            {available.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <p className="mt-3 text-xs text-secondary">
        <Link to="/teachers" className="text-primary hover:underline">
          {t('teachers.add')}
        </Link>
      </p>
    </Modal>
  );
}

/** A subject: its teachers (each an independent content space) and subject-level files. */
export function SubjectContentPage() {
  const { t, i18n } = useTranslation();
  const { subjectId = '' } = useParams();
  const api = useApi();
  const queryClient = useQueryClient();
  const subject = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => subjectsApi(api).get(subjectId),
  });
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [unassigning, setUnassigning] = useState<SubjectTeacherRow | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['subject', subjectId] });
    void queryClient.invalidateQueries({ queryKey: ['teachers'] });
  };
  const Chevron = i18n.dir() === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <QueryView query={subject}>
      {(data) => {
        const active = data.teachers.filter((row) => !row.archivedAt);
        return (
          <>
            <PageHeader
              breadcrumbs={[
                {
                  label: t('content.title'),
                  to: `/content?grade=${data.gradeId}`,
                },
                {
                  label: data.grade.name,
                  to: `/content?grade=${data.gradeId}`,
                },
                { label: data.name },
              ]}
              title={data.name}
              subtitle={data.description ?? undefined}
              actions={
                <>
                  {data.archivedAt && <Badge>{t('common.archivedBadge')}</Badge>}
                  <Button variant="outline" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                    {t('common.edit')}
                  </Button>
                </>
              }
            />
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader
                  title={t('subjects.teachers')}
                  actions={
                    <Button size="sm" icon={<UserPlus className="size-4" />} onClick={() => setAssigning(true)}>
                      {t('subjects.assignTeacher')}
                    </Button>
                  }
                />
                {data.teachers.length === 0 ? (
                  <EmptyState title={t('subjects.noTeachers')} />
                ) : (
                  <ul className="divide-y divide-border">
                    {data.teachers.map((row) => (
                      <li
                        key={row.id}
                        className={`flex items-center gap-2 px-3 py-3 ${row.archivedAt ? 'opacity-60' : ''}`}
                      >
                        {!row.archivedAt ? (
                          <ReorderButtons
                            index={active.indexOf(row)}
                            count={active.length}
                            onMove={(from, to) =>
                              runAction(
                                () =>
                                  subjectsApi(api).reorderTeachers(
                                    subjectId,
                                    moveItem(active, from, to).map((item) => item.id),
                                  ),
                                undefined,
                                refresh,
                              )
                            }
                          />
                        ) : (
                          <span className="w-16" />
                        )}
                        <Link
                          to={`/content/spaces/${row.id}`}
                          className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted"
                        >
                          <Avatar
                            name={row.teacher.name}
                            src={
                              row.teacher.hasImage
                                ? `${api.baseUrl}/api/v1/media/teachers/${row.teacher.id}/image`
                                : null
                            }
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold group-hover:text-primary">{row.teacher.name}</p>
                            <p className="text-xs text-secondary">
                              {t('content.topicsCount', {
                                count: row.topicsCount,
                              })}
                            </p>
                          </div>
                          {row.archivedAt && <Badge>{t('common.archivedBadge')}</Badge>}
                          <Chevron className="size-4 text-secondary" aria-hidden />
                        </Link>
                        <ActionsMenu
                          actions={[
                            row.archivedAt
                              ? {
                                  label: t('common.restore'),
                                  icon: <ArchiveRestore className="size-4" />,
                                  onSelect: () =>
                                    runAction(
                                      () => subjectTeachersApi(api).restore(row.id),
                                      t('common.saved'),
                                      refresh,
                                    ),
                                }
                              : {
                                  label: t('subjects.unassign'),
                                  icon: <Unlink className="size-4" />,
                                  tone: 'danger',
                                  onSelect: () => setUnassigning(row),
                                },
                          ]}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <FilesSection scope="SUBJECT" parentId={subjectId} title={t('content.subjectFiles')} />
            </div>
            <AssignTeacherModal
              open={assigning}
              onOpenChange={setAssigning}
              subjectId={subjectId}
              assignedIds={active.map((row) => row.teacherId)}
              onAssigned={refresh}
            />
            <SubjectFormModal open={editing} onOpenChange={setEditing} subject={data} />
            <ConfirmDialog
              open={unassigning !== null}
              onOpenChange={(open) => !open && setUnassigning(null)}
              title={`${t('subjects.unassign')}: ${unassigning?.teacher.name ?? ''}`}
              body={t('subjects.unassignConfirm')}
              confirmLabel={t('subjects.unassign')}
              onConfirm={() => subjectTeachersApi(api).unassign(unassigning!.id).then(refresh)}
            />
          </>
        );
      }}
    </QueryView>
  );
}
