import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';

const controlBase =
  'w-full rounded-lg border bg-surface px-3 text-sm text-text placeholder:text-secondary/70 transition-colors ' +
  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted disabled:text-secondary';

function controlClass(invalid: boolean | undefined, extra?: string) {
  return cn(controlBase, invalid ? 'border-danger' : 'border-border', extra);
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
}

/** Label + control + hint/error, wired for accessibility (ids, aria-invalid, aria-describedby). */
export function Field({ label, error, hint, required, optional, className, children }: FieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
        {required && (
          <span className="ms-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
        {optional && <span className="ms-1 text-xs font-normal text-secondary">({t('common.optional')})</span>}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
      })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type WithRef<T, E> = T & { ref?: Ref<E>; invalid?: boolean };

export function Input({
  className,
  invalid,
  ref,
  ...props
}: WithRef<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) {
  return <input ref={ref} className={controlClass(invalid, cn('h-10', className))} {...props} />;
}

export function Textarea({
  className,
  invalid,
  ref,
  ...props
}: WithRef<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>) {
  return <textarea ref={ref} className={controlClass(invalid, cn('min-h-24 py-2', className))} {...props} />;
}

export function Select({
  className,
  invalid,
  ref,
  children,
  ...props
}: WithRef<SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>) {
  return (
    <select ref={ref} className={controlClass(invalid, cn('h-10 pe-8', className))} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  ref?: Ref<HTMLInputElement>;
}) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-text', className)}>
      <input ref={ref} type="checkbox" className="size-4 rounded border-border accent-primary" {...props} />
      {label}
    </label>
  );
}
