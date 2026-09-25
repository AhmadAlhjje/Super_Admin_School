import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * List state (page, search, filters) kept in the URL, so filtered views survive reloads,
 * can be shared, and the back button works. Changing any filter resets to page 1.
 */
export function useListParams<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();

  const values = useMemo(() => {
    const result = { ...defaults } as T & { page: number };
    for (const key of Object.keys(defaults)) {
      const value = params.get(key);
      if (value !== null) (result as Record<string, string>)[key] = value;
    }
    result.page = Math.max(1, Number(params.get('page') ?? 1) || 1);
    return result;
  }, [params, defaults]);

  const set = useCallback(
    (patch: Partial<T> & { page?: number }) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            const isDefault = key !== 'page' && value === defaults[key];
            if (value === undefined || value === '' || isDefault || (key === 'page' && value === 1)) next.delete(key);
            else next.set(key, String(value));
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams, defaults],
  );

  return [values, set] as const;
}
