import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Unlock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { accessApi } from '../../api/endpoints/people';
import { errorMessage } from '../../api/errors';
import type { AccessTree } from '../../api/types';
import { useApi } from '../../platform/platform-context';
import { Switch } from '../../ui/controls';
import { QueryView } from '../../ui/data-table';
import { Badge, Card } from '../../ui/display';
import { EmptyState } from '../../ui/feedback';

type Change = { kind: 'subject'; id: string; open: boolean } | { kind: 'teacher'; id: string; open: boolean };

/**
 * One student's access tree: grade → subject (switch) → teachers (switch).
 * Opening a teacher grants all of that teacher's current and future content in the subject.
 * "Effective" access (what the student really gets) needs both switches on; the UI shows the
 * lock state the student will see.
 */
export function StudentAccessPanel({ studentId }: { studentId: string }) {
  const { t } = useTranslation();
  const api = useApi();
  const queryClient = useQueryClient();
  const queryKey = ['access', studentId];
  const tree = useQuery({
    queryKey,
    queryFn: () => accessApi(api).tree(studentId),
  });

  const mutation = useMutation({
    mutationFn: (change: Change) =>
      change.kind === 'subject'
        ? accessApi(api).setSubject(studentId, change.id, change.open)
        : accessApi(api).setTeacher(studentId, change.id, change.open),
    onSuccess: (updated: AccessTree) => {
      queryClient.setQueryData(queryKey, updated);
      void queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      toast.success(t('access.updated'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <QueryView query={tree}>
      {(data) => {
        const grades = data.grades.filter((grade) => grade.subjects.length > 0);
        if (grades.length === 0) return <EmptyState title={t('access.noCatalog')} />;
        return (
          <div className="flex flex-col gap-6">
            {grades.map((grade) => (
              <section key={grade.id} aria-labelledby={`grade-${grade.id}`}>
                <h3 id={`grade-${grade.id}`} className="mb-3 text-sm font-bold text-secondary">
                  {grade.name}
                </h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {grade.subjects.map((subject) => (
                    <Card key={subject.id} className="overflow-hidden">
                      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          {subject.open ? (
                            <Unlock className="size-4 text-success" aria-hidden />
                          ) : (
                            <Lock className="size-4 text-secondary" aria-hidden />
                          )}
                          <span className="font-bold text-text">{subject.name}</span>
                          <Badge tone={subject.open ? 'success' : 'neutral'}>
                            {subject.open ? t('access.open') : t('access.locked')}
                          </Badge>
                        </div>
                        <Switch
                          checked={subject.open}
                          disabled={mutation.isPending}
                          label={t('access.subjectToggle', {
                            name: subject.name,
                          })}
                          onCheckedChange={(open) =>
                            mutation.mutate({
                              kind: 'subject',
                              id: subject.id,
                              open,
                            })
                          }
                        />
                      </div>
                      {subject.teachers.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-secondary">{t('access.noTeachers')}</p>
                      ) : (
                        <ul className="divide-y divide-border">
                          {subject.teachers.map((teacher) => (
                            <li
                              key={teacher.subjectTeacherId}
                              className="flex items-center justify-between gap-3 px-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="flex items-center gap-2 text-sm font-semibold text-text">
                                  {teacher.effective ? (
                                    <Unlock className="size-3.5 text-success" aria-hidden />
                                  ) : (
                                    <Lock className="size-3.5 text-secondary" aria-hidden />
                                  )}
                                  {teacher.name}
                                </p>
                                {teacher.open && !teacher.effective && (
                                  <p className="mt-0.5 text-xs text-[#b45309]">{t('access.needsSubject')}</p>
                                )}
                              </div>
                              <Switch
                                checked={teacher.open}
                                disabled={mutation.isPending}
                                label={t('access.teacherToggle', {
                                  name: teacher.name,
                                })}
                                onCheckedChange={(open) =>
                                  mutation.mutate({
                                    kind: 'teacher',
                                    id: teacher.subjectTeacherId,
                                    open,
                                  })
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        );
      }}
    </QueryView>
  );
}
