import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { authApi } from '../../api/endpoints/people';
import { errorMessage } from '../../api/errors';
import { useAuth } from '../../auth/auth-context';
import { formatDateTime } from '../../lib/format';
import { fieldError } from '../../lib/translate';
import { strongPasswordField } from '../../lib/validation';
import { useApi, usePortal } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { Card, CardHeader, DetailList, PageHeader } from '../../ui/display';
import { Field, Input } from '../../ui/form';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'validation.required'),
    newPassword: strongPasswordField(),
    confirmPassword: z.string().min(1, 'validation.required'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation.passwordMismatch',
  });
type Values = z.infer<typeof schema>;

/**
 * Own profile. Everyone can change their password (other sessions are ended). The institute
 * owner cannot change their name or phone — only the super admin can (spec §44–45).
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const api = useApi();
  const { portal } = usePortal();
  const { user } = useAuth();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  const change = useMutation({
    mutationFn: (values: Values) => authApi(api, portal).changePassword(values),
    onSuccess: () => {
      toast.success(t('profile.passwordChanged'));
      form.reset();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!user) return null;
  return (
    <>
      <PageHeader title={t('profile.title')} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={t('profile.account')} />
          <div className="flex flex-col gap-4 p-5">
            <DetailList
              items={[
                { label: t('common.name'), value: user.name },
                {
                  label: t('common.phone'),
                  value: <span className="ltr-nums">{user.phone}</span>,
                },
                { label: t('profile.role'), value: t(`roles.${user.role}`) },
                {
                  label: t('students.lastLogin'),
                  value: formatDateTime(user.lastLoginAt),
                },
              ]}
            />
            {user.role === 'OWNER' && (
              <p className="flex items-start gap-2 rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-dark">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t('profile.identityLocked')}
              </p>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title={t('profile.changePassword')} />
          <form
            noValidate
            className="flex flex-col gap-4 p-5"
            onSubmit={(e) => void form.handleSubmit((v) => change.mutate(v))(e)}
          >
            <Field
              label={t('profile.currentPassword')}
              error={fieldError(form.formState.errors.currentPassword)}
              required
            >
              {(field) => (
                <Input
                  {...field}
                  {...form.register('currentPassword')}
                  type="password"
                  autoComplete="current-password"
                  dir="ltr"
                />
              )}
            </Field>
            <Field
              label={t('profile.newPassword')}
              hint={t('profile.passwordHint')}
              error={fieldError(form.formState.errors.newPassword)}
              required
            >
              {(field) => (
                <Input
                  {...field}
                  {...form.register('newPassword')}
                  type="password"
                  autoComplete="new-password"
                  dir="ltr"
                />
              )}
            </Field>
            <Field
              label={t('profile.confirmPassword')}
              error={fieldError(form.formState.errors.confirmPassword)}
              required
            >
              {(field) => (
                <Input
                  {...field}
                  {...form.register('confirmPassword')}
                  type="password"
                  autoComplete="new-password"
                  dir="ltr"
                />
              )}
            </Field>
            <Button type="submit" loading={change.isPending} className="self-start">
              {t('profile.changePassword')}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
