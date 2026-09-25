import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../api/errors';
import { cn } from '../lib/cn';
import { Button } from './button';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  const { t } = useTranslation();
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-secondary', className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="sr-only">{label ?? t('common.loading')}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

/** Placeholder rows for list/table loading states. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t('common.loading')} className="flex flex-col gap-3 p-4">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-secondary">
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </div>
      <p className="font-semibold text-text">{title}</p>
      {description && <p className="max-w-sm text-sm text-secondary">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <p className="font-semibold text-text">{t('common.errorLoading')}</p>
      {error !== undefined && <p className="text-sm text-secondary">{errorMessage(error)}</p>}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

/** Determinate (value 0–100) or indeterminate (value undefined) progress bar. */
export function ProgressBar({
  value,
  tone = 'primary',
  label,
}: {
  value?: number;
  tone?: 'primary' | 'success' | 'danger';
  label?: string;
}) {
  const color = tone === 'success' ? 'bg-success' : tone === 'danger' ? 'bg-danger' : 'bg-primary';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === undefined ? undefined : Math.round(value)}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      {value === undefined ? (
        <div
          className={cn('h-full w-2/5 rounded-full', color)}
          style={{
            animation: 'progress-indeterminate 1.4s ease-in-out infinite',
          }}
        />
      ) : (
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', color)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      )}
    </div>
  );
}
