import { useQuery } from '@tanstack/react-query';
import { gradesApi, subjectsApi, teachersApi } from '../api/endpoints/catalog';
import { useApi } from '../platform/platform-context';

/** Active grades for selects and filters. */
export function useGradeOptions() {
  const api = useApi();
  return useQuery({
    queryKey: ['grades', 'active'],
    queryFn: () => gradesApi(api).list({ status: 'active' }),
  });
}

/** Active subjects (optionally of one grade) for selects. */
export function useSubjectOptions(gradeId?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['subjects', 'options', gradeId ?? 'all'],
    queryFn: () =>
      subjectsApi(api)
        .list({ gradeId, status: 'active', limit: 100 })
        .then((page) => page.items),
  });
}

/** Active teachers for selects. */
export function useTeacherOptions() {
  const api = useApi();
  return useQuery({
    queryKey: ['teachers', 'options'],
    queryFn: () =>
      teachersApi(api)
        .list({ status: 'active', limit: 100 })
        .then((page) => page.items),
  });
}
