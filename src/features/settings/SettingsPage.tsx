import {
  adminApi,
  Button,
  Card,
  CardHeader,
  errorMessage,
  Field,
  fieldError,
  Input,
  PageHeader,
  QueryView,
  requiredText,
  Switch,
  useApi,
  type SystemSettings,
} from '../../shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  instituteName: requiredText(120),
  institutePhone: z.string().trim().max(20),
  studentSelfRegistration: z.boolean(),
  offlineDownloadsEnabled: z.boolean(),
  offlineLicenseDays: z.number().int().min(1).max(365),
});
type Values = z.infer<typeof schema>;

function ToggleRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <p className="font-semibold text-text">{label}</p>
        <p className="mt-1 text-sm text-secondary">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function SettingsForm({ settings }: { settings: SystemSettings }) {
  const { t } = useTranslation();
  const api = useApi();
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { ...settings, institutePhone: settings.institutePhone ?? '' },
  });
  const save = useMutation({
    mutationFn: (values: Values) =>
      adminApi(api).updateSettings({ ...values, institutePhone: values.institutePhone || null }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['settings'], updated);
      form.reset({ ...updated, institutePhone: updated.institutePhone ?? '' });
      toast.success(t('settings.saved'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const toggle = (name: 'studentSelfRegistration' | 'offlineDownloadsEnabled', label: string) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} label={label} />}
    />
  );

  return (
    <form noValidate className="flex flex-col gap-6" onSubmit={(e) => void form.handleSubmit((v) => save.mutate(v))(e)}>
      <Card>
        <CardHeader title={t('settings.institute')} />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label={t('settings.instituteName')} error={fieldError(form.formState.errors.instituteName)} required>
            {(field) => <Input {...field} {...form.register('instituteName')} />}
          </Field>
          <Field label={t('settings.institutePhone')} optional>
            {(field) => (
              <Input {...field} {...form.register('institutePhone')} type="tel" dir="ltr" className="text-start" />
            )}
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader title={t('settings.students')} />
        <div className="px-5">
          <ToggleRow label={t('settings.selfRegistration')} hint={t('settings.selfRegistrationHint')}>
            {toggle('studentSelfRegistration', t('settings.selfRegistration'))}
          </ToggleRow>
        </div>
      </Card>
      <Card>
        <CardHeader title={t('settings.media')} />
        <div className="divide-y divide-border px-5">
          <ToggleRow label={t('settings.offline')} hint={t('settings.offlineHint')}>
            {toggle('offlineDownloadsEnabled', t('settings.offline'))}
          </ToggleRow>
          <div className="py-4">
            <Field label={t('settings.offlineDays')} error={fieldError(form.formState.errors.offlineLicenseDays)}>
              {(field) => (
                <Input
                  {...field}
                  {...form.register('offlineLicenseDays', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={365}
                  className="w-32"
                  dir="ltr"
                />
              )}
            </Field>
          </div>
        </div>
      </Card>
      <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty} className="self-start">
        {t('common.save')}
      </Button>
    </form>
  );
}

/** System settings (super admin only). */
export function SettingsPage() {
  const { t } = useTranslation();
  const api = useApi();
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => adminApi(api).settings() });
  return (
    <>
      <PageHeader title={t('settings.title')} />
      <QueryView query={settings}>{(data) => <SettingsForm settings={data} />}</QueryView>
    </>
  );
}
