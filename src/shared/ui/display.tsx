import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from '../lib/cn';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({ title, actions, subtitle }: { title: string; actions?: ReactNode; subtitle?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <h2 className="text-base font-bold text-text">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-secondary',
  primary: 'bg-primary-soft text-primary-dark',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-[#b45309]',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'primary',
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-secondary">{label}</p>
        <p className="text-2xl font-bold text-text ltr-nums">{value}</p>
        {hint && <p className="text-xs text-secondary">{hint}</p>}
      </div>
    </Card>
  );
}

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-16 text-xl' : 'size-10 text-sm';
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
  if (src) return <img src={src} alt={name} className={cn('shrink-0 rounded-full object-cover', dims)} />;
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary',
        dims,
      )}
    >
      {initials}
    </span>
  );
}

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { i18n } = useTranslation();
  const Separator = i18n.dir() === 'rtl' ? ChevronLeft : ChevronRight;
  return (
    <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-secondary">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 && <Separator className="size-4 opacity-60" aria-hidden />}
          {item.to ? (
            <Link to={item.to} className="hover:text-primary hover:underline">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-semibold text-text">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
}) {
  return (
    <header className="mb-6 flex flex-col gap-3">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-secondary">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Label/value rows for detail panels. */
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-secondary">{item.label}</dt>
          <dd className="text-sm font-semibold text-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
