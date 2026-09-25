import type { UseQueryResult } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import { Button } from './button';
import { EmptyState, ErrorState, SkeletonList } from './feedback';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Hide on narrow screens to keep tables readable on tablets. */
  hideBelow?: 'md' | 'lg';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty: { title: string; description?: string; action?: ReactNode };
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
}

const HIDE = { md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

/** Table with built-in loading / error / empty states (never a blank screen). */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  empty,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  if (loading && !rows) return <SkeletonList rows={6} />;
  if (error && !rows) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0) return <EmptyState {...empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/60 text-start text-xs text-secondary">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-start font-semibold',
                  column.hideBelow && HIDE[column.hideBelow],
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-border last:border-0 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-primary-soft/40',
                rowClassName?.(row),
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('px-4 py-3 align-middle', column.hideBelow && HIDE[column.hideBelow], column.className)}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-secondary">
      <span>{t('common.total', { count: total })}</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          icon={rtl ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        >
          {t('common.previous')}
        </Button>
        <span className="ltr-nums">{t('common.pageOf', { page, pages: totalPages })}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {t('common.next')}
          {rtl ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

/** Renders loading / error / content for any query consistently. */
export function QueryView<T>({
  query,
  children,
  skeleton,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
}) {
  if (query.isPending) return <>{skeleton ?? <SkeletonList />}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <>{children(query.data)}</>;
}
