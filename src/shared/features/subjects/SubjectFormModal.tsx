import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { subjectsApi } from '../../api/endpoints/catalog';
import { errorMessage } from '../../api/errors';
import type { Subject } from '../../api/types';
import { useGradeOptions } from '../../hooks/use-lookups';
import { fieldError } from '../../lib/translate';
import { optionalText, requiredText } from '../../lib/validation';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { Field, Input, Select, Textarea } from '../../ui/form';
import { Modal } from '../../ui/overlay';

const schema = z.object({
  gradeId: z.string().min(1, 'validation.required'),
  name: requiredText(120),
  description: optionalText(5000),
});
type Values = z.infer<typeof schema>;

export function SubjectFormModal({
  open,
  onOpenChange,
  subject,
  defaultGradeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject;
  defaultGradeId?: string;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const queryClient = useQueryClient();
  const grades = useGradeOptions();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      gradeId: subject?.gradeId ?? defaultGradeId ?? '',
      name: subject?.name ?? '',
      description: subject?.description ?? '',
    },
  });
  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const body = {
        ...values,
        description: values.description?.trim() || null,
      };
      return subject ? subjectsApi(api).update(subject.id, body) : subjectsApi(api).create(body);
    },
    onSuccess: () => {
      toast.success(subject ? t('common.saved') : t('subjects.created'));
      void queryClient.invalidateQueries({ queryKey: ['subjects'] });
      void queryClient.invalidateQueries({ queryKey: ['subject'] });
      void queryClient.invalidateQueries({ queryKey: ['grades'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={subject ? t('subjects.edit') : t('subjects.add')}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="subject-form" loading={mutation.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        id="subject-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => void form.handleSubmit((v) => mutation.mutate(v))(e)}
      >
        <Field label={t('subjects.grade')} error={fieldError(form.formState.errors.gradeId)} required>
          {(field) => (
            <Select {...field} {...form.register('gradeId')}>
              <option value="">{t('common.select')}</option>
              {grades.data?.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('common.name')} error={fieldError(form.formState.errors.name)} required>
          {(field) => <Input {...field} {...form.register('name')} />}
        </Field>
        <Field label={t('common.description')} optional error={fieldError(form.formState.errors.description)}>
          {(field) => <Textarea {...field} {...form.register('description')} rows={3} />}
        </Field>
      </form>
    </Modal>
  );
}
