import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage } from '../../api/errors';
import { fieldError } from '../../lib/translate';
import { strongPasswordField } from '../../lib/validation';
import { Button } from '../../ui/button';
import { Field, Input } from '../../ui/form';
import { Modal } from '../../ui/overlay';

const schema = z.object({ newPassword: strongPasswordField() });

/** Staff sets a new password for an account (all its sessions end). */
export function ResetPasswordModal({
  open,
  onOpenChange,
  title,
  onSubmit,
  successMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: (newPassword: string) => Promise<unknown>;
  successMessage: string;
}) {
  const { t } = useTranslation();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => onSubmit(values.newPassword),
    onSuccess: () => {
      toast.success(successMessage);
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="reset-password-form" loading={mutation.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        id="reset-password-form"
        noValidate
        onSubmit={(e) => void form.handleSubmit((values) => mutation.mutate(values))(e)}
      >
        <Field
          label={t('students.newPassword')}
          hint={t('profile.passwordHint')}
          error={fieldError(form.formState.errors.newPassword)}
          required
        >
          {(field) => (
            <Input {...field} {...form.register('newPassword')} dir="ltr" autoComplete="new-password" autoFocus />
          )}
        </Field>
      </form>
    </Modal>
  );
}
