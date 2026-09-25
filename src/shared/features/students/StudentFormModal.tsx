import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { studentsApi } from '../../api/endpoints/people';
import { errorMessage } from '../../api/errors';
import type { StudentDetails } from '../../api/types';
import { useGradeOptions } from '../../hooks/use-lookups';
import { fieldError } from '../../lib/translate';
import { isStrongPassword, optionalText, phoneField, requiredText } from '../../lib/validation';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { Field, Input, Select, Textarea } from '../../ui/form';
import { Modal } from '../../ui/overlay';

/** The password is required (and must be strong) only when creating. */
const schemaFor = (editing: boolean) =>
  z
    .object({
      name: requiredText(120),
      phone: phoneField(),
      gradeId: z.string(),
      notes: optionalText(500),
      password: z.string(),
    })
    .superRefine((values, ctx) => {
      if (editing || isStrongPassword(values.password)) return;
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: values.password ? 'validation.passwordWeak' : 'validation.required',
      });
    });
type FormValues = z.infer<ReturnType<typeof schemaFor>>;

/** Create or edit a student (password only on create; resets use a dedicated action). */
export function StudentFormModal({
  open,
  onOpenChange,
  student,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: StudentDetails;
  onSaved?: (student: StudentDetails) => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const queryClient = useQueryClient();
  const grades = useGradeOptions();
  const editing = Boolean(student);

  const form = useForm<FormValues>({
    resolver: zodResolver(schemaFor(editing)),
    values: {
      name: student?.name ?? '',
      phone: student?.phone ?? '',
      gradeId: student?.grade?.id ?? '',
      notes: student?.notes ?? '',
      password: '',
    },
  });
  const { register, handleSubmit, formState } = form;

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        phone: values.phone,
        gradeId: values.gradeId || null,
        notes: values.notes || null,
      };
      return student
        ? studentsApi(api).update(student.id, payload)
        : studentsApi(api).create({ ...payload, password: values.password });
    },
    onSuccess: (saved) => {
      toast.success(editing ? t('students.updated') : t('students.created'));
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.setQueryData(['student', saved.id], saved);
      onSaved?.(saved);
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? t('students.edit') : t('students.add')}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="student-form" loading={mutation.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        id="student-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => void handleSubmit((v) => mutation.mutate(v))(e)}
      >
        <Field label={t('common.name')} error={fieldError(formState.errors.name)} required>
          {(field) => <Input {...field} {...register('name')} autoFocus />}
        </Field>
        <Field label={t('common.phone')} error={fieldError(formState.errors.phone)} required>
          {(field) => <Input {...field} {...register('phone')} type="tel" dir="ltr" className="text-start" />}
        </Field>
        {!editing && (
          <Field
            label={t('students.password')}
            hint={t('profile.passwordHint')}
            error={fieldError(formState.errors.password)}
            required
          >
            {(field) => (
              <Input {...field} {...register('password')} type="text" dir="ltr" autoComplete="new-password" />
            )}
          </Field>
        )}
        <Field label={t('students.grade')} optional>
          {(field) => (
            <Select {...field} {...register('gradeId')}>
              <option value="">{t('common.none')}</option>
              {grades.data?.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('students.notes')} optional error={fieldError(formState.errors.notes)}>
          {(field) => <Textarea {...field} {...register('notes')} rows={3} />}
        </Field>
      </form>
    </Modal>
  );
}
