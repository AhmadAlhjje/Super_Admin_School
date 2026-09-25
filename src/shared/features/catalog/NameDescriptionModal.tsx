import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { errorMessage } from '../../api/errors';
import { fieldError } from '../../lib/translate';
import { optionalText, requiredText } from '../../lib/validation';
import { Button } from '../../ui/button';
import { Field, Input, Textarea } from '../../ui/form';
import { Modal } from '../../ui/overlay';

const schema = z.object({
  name: requiredText(200),
  description: optionalText(5000),
});
export type NameDescriptionValues = z.infer<typeof schema>;

/** Create/edit form for the simple catalog entities (grade, topic, session) and renames. */
export function NameDescriptionModal({
  open,
  onOpenChange,
  title,
  nameLabel,
  initial,
  onSubmit,
  successMessage,
  withDescription = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  nameLabel: string;
  initial?: { name: string; description: string | null };
  onSubmit: (values: { name: string; description: string | null }) => Promise<unknown>;
  successMessage?: string;
  /** Files and videos only have a title. */
  withDescription?: boolean;
}) {
  const { t } = useTranslation();
  const form = useForm<NameDescriptionValues>({
    resolver: zodResolver(schema),
    values: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
    },
  });
  const mutation = useMutation({
    mutationFn: (values: NameDescriptionValues) =>
      onSubmit({
        name: values.name,
        description: values.description?.trim() || null,
      }),
    onSuccess: () => {
      toast.success(successMessage ?? t('common.saved'));
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
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="name-description-form" loading={mutation.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        id="name-description-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => void form.handleSubmit((values) => mutation.mutate(values))(e)}
      >
        <Field label={nameLabel} error={fieldError(form.formState.errors.name)} required>
          {(field) => <Input {...field} {...form.register('name')} autoFocus />}
        </Field>
        {withDescription && (
          <Field label={t('common.description')} optional error={fieldError(form.formState.errors.description)}>
            {(field) => <Textarea {...field} {...form.register('description')} rows={3} />}
          </Field>
        )}
      </form>
    </Modal>
  );
}
