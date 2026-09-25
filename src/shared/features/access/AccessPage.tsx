import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { studentsApi } from '../../api/endpoints/people';
import { useListParams } from '../../hooks/use-list-params';
import { cn } from '../../lib/cn';
import { useApi } from '../../platform/platform-context';
import { SearchInput } from '../../ui/controls';
import { Card, CardHeader, PageHeader } from '../../ui/display';
import { EmptyState, SkeletonList } from '../../ui/feedback';
import { StudentAccessPanel } from './StudentAccessPanel';

const DEFAULTS = { search: '' };

/** Access management (spec §111): choose a student, then open/lock subjects and teachers. */
export function AccessPage() {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const { studentId } = useParams();
  const [params, setParams] = useListParams(DEFAULTS);
  const students = useQuery({
    queryKey: ['students', 'access-picker', params.search],
    queryFn: () =>
      studentsApi(api).list({
        search: params.search || undefined,
        limit: 30,
        lifecycle: 'active',
        sort: 'name',
        order: 'asc',
      }),
  });

  return (
    <>
      <PageHeader title={t('access.title')} subtitle={t('access.subtitle')} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
        <Card className="h-fit">
          <CardHeader title={t('access.chooseStudent')} />
          <div className="border-b border-border p-3">
            <SearchInput
              value={params.search}
              onChange={(search) => setParams({ search })}
              placeholder={t('access.searchStudent')}
            />
          </div>
          {students.isPending ? (
            <SkeletonList rows={4} />
          ) : students.data?.items.length === 0 ? (
            <EmptyState title={t('common.noResults')} />
          ) : (
            <ul
              className="max-h-[60vh] divide-y divide-border overflow-y-auto"
              role="listbox"
              aria-label={t('access.chooseStudent')}
            >
              {students.data?.items.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={student.id === studentId}
                    onClick={() =>
                      void navigate(
                        `/access/${student.id}${params.search ? `?search=${encodeURIComponent(params.search)}` : ''}`,
                      )
                    }
                    className={cn(
                      'flex w-full flex-col items-start px-4 py-3 text-start transition-colors hover:bg-muted',
                      student.id === studentId && 'bg-primary-soft',
                    )}
                  >
                    <span className="font-semibold text-text">{student.name}</span>
                    <span className="text-xs text-secondary ltr-nums">{student.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div>
          {studentId ? (
            <StudentAccessPanel key={studentId} studentId={studentId} />
          ) : (
            <Card>
              <EmptyState title={t('access.chooseStudent')} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
