import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { errorMessage } from '../api/errors';
import { fieldError } from '../lib/translate';
import { phoneField } from '../lib/validation';
import { usePortal } from '../platform/platform-context';
import { Button } from '../ui/button';
import { Field, Input } from '../ui/form';
import { LanguageSwitch } from '../layout/LanguageSwitch';
import { useAuth } from './auth-context';

const schema = z.object({
  phone: phoneField(),
  password: z.string().min(1, 'validation.required'),
});
type LoginForm = z.infer<typeof schema>;

/** Shared login page; the portal decides the endpoint (admin vs owner) and the subtitle. */
export function LoginPage() {
  const { t } = useTranslation();
  const { portal } = usePortal();
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = (location.state as { from?: string; expired?: boolean } | null) ?? {};
  const [submitError, setSubmitError] = useState<string | null>(redirect.expired ? t('auth.sessionExpired') : null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  if (state.status === 'authenticated') return <Navigate to={redirect.from ?? '/'} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values.phone, values.password);
      void navigate(redirect.from ?? '/', { replace: true });
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  });

  const isAdmin = portal === 'ADMIN_WEB';
  const Icon = isAdmin ? ShieldCheck : GraduationCap;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="absolute top-4 end-4">
        <LanguageSwitch />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
            <Icon className="size-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold text-text">{t('auth.title')}</h1>
          <p className="text-sm text-secondary">{isAdmin ? t('auth.adminSubtitle') : t('auth.ownerSubtitle')}</p>
        </div>
        <form
          noValidate
          onSubmit={(event) => void onSubmit(event)}
          className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-card)]"
        >
          {submitError && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {submitError}
            </p>
          )}
          <Field label={t('common.phone')} error={fieldError(errors.phone)} required>
            {(field) => (
              <Input
                {...field}
                {...register('phone')}
                type="tel"
                inputMode="tel"
                autoComplete="username"
                dir="ltr"
                className="text-start"
              />
            )}
          </Field>
          <Field label={t('auth.password')} error={fieldError(errors.password)} required>
            {(field) => (
              <Input {...field} {...register('password')} type="password" autoComplete="current-password" dir="ltr" />
            )}
          </Field>
          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? t('auth.submitting') : t('auth.submit')}
          </Button>
        </form>
      </div>
    </main>
  );
}
