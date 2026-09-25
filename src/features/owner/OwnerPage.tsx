import {
  adminApi,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DetailList,
  EmptyState,
  errorMessage,
  Field,
  fieldError,
  formatDate,
  formatDateTime,
  Input,
  Modal,
  PageHeader,
  phoneField,
  QueryView,
  requiredText,
  ResetPasswordModal,
  runAction,
  strongPasswordField,
  useApi,
  type OwnerAccount,
} from '../../shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Power, PowerOff, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

const identitySchema = z.object({ name: requiredText(120), phone: phoneField() });
const createSchema = identitySchema.extend({ password: strongPasswordField() });
type CreateValues = z.infer<typeof createSchema>;

/** Create the owner, or edit name/phone (only the super admin may change these). */
function OwnerFormModal({
  open,
  onOpenChange,
  owner,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner?: OwnerAccount;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const form = useForm<CreateValues>({
    resolver: zodResolver(owner ? identitySchema.extend({ password: z.string() }) : createSchema),
    values: { name: owner?.name ?? '', phone: owner?.phone ?? '', password: '' },
  });
  const save = useMutation({
    mutationFn: (values: CreateValues) =>
      owner
        ? adminApi(api).updateOwner(owner.id, { name: values.name, phone: values.phone })
        : adminApi(api).createOwner(values),
    onSuccess: () => {
      toast.success(owner ? t('owners.updated') : t('owners.created'));
      onSaved();
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={owner ? t('owners.edit') : t('owners.create')}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="owner-form" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        id="owner-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => void form.handleSubmit((v) => save.mutate(v))(e)}
      >
        <Field label={t('common.name')} error={fieldError(form.formState.errors.name)} required>
          {(field) => <Input {...field} {...form.register('name')} />}
        </Field>
        <Field label={t('common.phone')} error={fieldError(form.formState.errors.phone)} required>
          {(field) => <Input {...field} {...form.register('phone')} type="tel" dir="ltr" className="text-start" />}
        </Field>
        {!owner && (
          <Field
            label={t('auth.password')}
            hint={t('profile.passwordHint')}
            error={fieldError(form.formState.errors.password)}
            required
          >
            {(field) => <Input {...field} {...form.register('password')} dir="ltr" autoComplete="new-password" />}
          </Field>
        )}
      </form>
    </Modal>
  );
}

type Dialog = 'create' | 'edit' | 'password' | 'disable' | null;

/** The institute owner account (spec §45): single institute ⇒ one active owner. */
export function OwnerPage() {
  const { t } = useTranslation();
  const api = useApi();
  const admin = adminApi(api);
  const queryClient = useQueryClient();
  const owners = useQuery({ queryKey: ['owners'], queryFn: () => admin.owners() });
  const [dialog, setDialog] = useState<Dialog>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['owners'] });
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <>
      <PageHeader title={t('owners.title')} subtitle={t('owners.subtitle')} />
      <QueryView query={owners}>
        {(list) => {
          const owner = list.find((account) => !account.archived);
          if (!owner) {
            return (
              <Card>
                <EmptyState
                  title={t('owners.none')}
                  action={
                    <Button icon={<UserPlus className="size-4" />} onClick={() => setDialog('create')}>
                      {t('owners.create')}
                    </Button>
                  }
                />
              </Card>
            );
          }
          return (
            <Card>
              <CardHeader
                title={owner.name}
                actions={
                  <>
                    {owner.status === 'ACTIVE' ? (
                      <Badge tone="success">{t('students.accountActive')}</Badge>
                    ) : (
                      <Badge tone="danger">{t('students.accountDisabled')}</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Pencil className="size-4" />}
                      onClick={() => setDialog('edit')}
                    >
                      {t('owners.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<KeyRound className="size-4" />}
                      onClick={() => setDialog('password')}
                    >
                      {t('students.resetPassword')}
                    </Button>
                    {owner.status === 'ACTIVE' ? (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<PowerOff className="size-4" />}
                        onClick={() => setDialog('disable')}
                      >
                        {t('students.disable')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        icon={<Power className="size-4" />}
                        onClick={() =>
                          runAction(() => admin.setOwnerEnabled(owner.id, true), t('common.saved'), refresh)
                        }
                      >
                        {t('students.enable')}
                      </Button>
                    )}
                  </>
                }
              />
              <div className="p-5">
                <DetailList
                  items={[
                    { label: t('common.name'), value: owner.name },
                    { label: t('common.phone'), value: <span className="ltr-nums">{owner.phone}</span> },
                    { label: t('common.createdAt'), value: formatDate(owner.createdAt) },
                    { label: t('students.lastLogin'), value: formatDateTime(owner.lastLoginAt) },
                  ]}
                />
              </div>
              <OwnerFormModal open={dialog === 'edit'} onOpenChange={close} owner={owner} onSaved={refresh} />
              <ResetPasswordModal
                open={dialog === 'password'}
                onOpenChange={close}
                title={t('students.resetPassword')}
                successMessage={t('common.saved')}
                onSubmit={(password) => admin.resetOwnerPassword(owner.id, password)}
              />
              <ConfirmDialog
                open={dialog === 'disable'}
                onOpenChange={close}
                title={t('students.disable')}
                body={t('owners.disableConfirm')}
                confirmLabel={t('students.disable')}
                onConfirm={() => admin.setOwnerEnabled(owner.id, false).then(refresh)}
              />
            </Card>
          );
        }}
      </QueryView>
      <OwnerFormModal open={dialog === 'create'} onOpenChange={close} onSaved={refresh} />
    </>
  );
}
