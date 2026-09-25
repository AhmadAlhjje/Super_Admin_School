import { useQuery } from '@tanstack/react-query';
import { BookOpen, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { subjectsApi } from '../../api/endpoints/catalog';
import { useGradeOptions } from '../../hooks/use-lookups';
import { cn } from '../../lib/cn';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { QueryView } from '../../ui/data-table';
import { Card, PageHeader } from '../../ui/display';
import { EmptyState, SkeletonList } from '../../ui/feedback';
import { SubjectFormModal } from '../subjects/SubjectFormModal';

/** Content entry point: pick a grade, then a subject (spec §49, §113). */
export function ContentHomePage() {
  const { t } = useTranslation();
  const api = useApi();
  const grades = useGradeOptions();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const gradeId = params.get('grade') ?? grades.data?.[0]?.id ?? '';

  useEffect(() => {
    if (!params.get('grade') && grades.data?.[0]) setParams({ grade: grades.data[0].id }, { replace: true });
  }, [grades.data, params, setParams]);

  const subjects = useQuery({
    queryKey: ['subjects', 'grade', gradeId],
    queryFn: () => subjectsApi(api).list({ gradeId, status: 'active', limit: 100 }),
    enabled: Boolean(gradeId),
  });
  const grade = grades.data?.find((item) => item.id === gradeId);

  return (
    <>
      <PageHeader title={t('content.title')} subtitle={t('content.subtitle')} />
      <QueryView query={grades} skeleton={<SkeletonList rows={2} />}>
        {(gradeList) =>
          gradeList.length === 0 ? (
            <Card>
              <EmptyState
                title={t('content.noGrades')}
                action={
                  <Link to="/grades">
                    <Button>{t('grades.add')}</Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-5">
              <div role="tablist" aria-label={t('content.chooseGrade')} className="flex flex-wrap gap-2">
                {gradeList.map((item) => (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={item.id === gradeId}
                    onClick={() => setParams({ grade: item.id })}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                      item.id === gradeId
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-surface text-secondary hover:text-text',
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{t('content.subjectsIn', { grade: grade?.name ?? '' })}</h2>
                <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                  {t('subjects.add')}
                </Button>
              </div>

              <QueryView query={subjects} skeleton={<SkeletonList rows={3} />}>
                {(page) =>
                  page.items.length === 0 ? (
                    <Card>
                      <EmptyState title={t('content.noSubjects')} />
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {page.items.map((subject) => (
                        <Link key={subject.id} to={`/content/subjects/${subject.id}`}>
                          <Card className="flex h-full items-center gap-4 p-5 transition-shadow hover:shadow-md">
                            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                              <BookOpen className="size-5" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-text">{subject.name}</p>
                              <p className="text-sm text-secondary">
                                {t('subjects.teachersCount', {
                                  count: subject.teachersCount ?? 0,
                                })}
                              </p>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )
                }
              </QueryView>
            </div>
          )
        }
      </QueryView>
      <SubjectFormModal open={creating} onOpenChange={setCreating} defaultGradeId={gradeId} />
    </>
  );
}
