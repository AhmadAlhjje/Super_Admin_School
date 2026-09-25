import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { teachersApi } from '../../api/endpoints/catalog';
import { errorMessage } from '../../api/errors';
import type { TeacherDetails } from '../../api/types';
import { useSubjectOptions } from '../../hooks/use-lookups';
import { fieldError } from '../../lib/translate';
import { normalizePhone, optionalText, PHONE_PATTERN, requiredText } from '../../lib/validation';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { Avatar } from '../../ui/display';
import { Checkbox, Field, Input, Textarea } from '../../ui/form';
import { Modal } from '../../ui/overlay';

const schema = z.object({
  name: requiredText(120),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((value) => value === '' || PHONE_PATTERN.test(value), 'validation.phone'),
  description: optionalText(5000),
  subjectIds: z.array(z.string()),
});
type Values = z.infer<typeof schema>;

/**
 * Create a teacher (optionally assigning subjects in the same transaction) or edit one,
 * including the photo. Subject assignments of an existing teacher are managed per subject.
 */
export function TeacherFormModal({
  open,
  onOpenChange,
  teacher,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: TeacherDetails;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const teachers = teachersApi(api);
  const queryClient = useQueryClient();
  const subjects = useSubjectOptions();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: teacher?.name ?? '',
      phone: teacher?.phone ?? '',
      description: teacher?.description ?? '',
      subjectIds: [],
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['teachers'] });
    void queryClient.invalidateQueries({ queryKey: ['subject'] });
  };

  const save = useMutation({
    mutationFn: (values: Values) => {
      const body = {
        name: values.name,
        phone: values.phone || null,
        description: values.description?.trim() || null,
      };
      return teacher ? teachers.update(teacher.id, body) : teachers.create({ ...body, subjectIds: values.subjectIds });
    },
    onSuccess: () => {
      toast.success(teacher ? t('teachers.updated') : t('teachers.created'));
      invalidate();
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const photoMutation = useMutation({
    mutationFn: (file: File | null) =>
      file ? teachers.uploadImage(teacher!.id, file) : teachers.removeImage(teacher!.id),
    onSuccess: (updated) => {
      setPhoto(updated.imageUrl);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const photoUrl = photo ?? teacher?.imageUrl ?? null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={teacher ? t('teachers.edit') : t('teachers.add')}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="teacher-form" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        id="teacher-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => void form.handleSubmit((v) => save.mutate(v))(e)}
      >
        {teacher && (
          <div className="flex items-center gap-4">
            <Avatar name={teacher.name} src={photoUrl ? `${api.baseUrl}${photoUrl}` : null} size="lg" />
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ImagePlus className="size-4" />}
                  loading={photoMutation.isPending}
                  onClick={() => fileInput.current?.click()}
                >
                  {t('teachers.uploadPhoto')}
                </Button>
                {photoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="size-4" />}
                    onClick={() => photoMutation.mutate(null)}
                  >
                    {t('teachers.removePhoto')}
                  </Button>
                )}
              </div>
              <p className="text-xs text-secondary">{t('teachers.photoHint')}</p>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) photoMutation.mutate(file);
                  event.target.value = '';
                }}
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('common.name')} error={fieldError(form.formState.errors.name)} required>
            {(field) => <Input {...field} {...form.register('name')} />}
          </Field>
          <Field label={t('common.phone')} optional error={fieldError(form.formState.errors.phone)}>
            {(field) => <Input {...field} {...form.register('phone')} type="tel" dir="ltr" className="text-start" />}
          </Field>
        </div>
        <Field label={t('common.description')} optional error={fieldError(form.formState.errors.description)}>
          {(field) => <Textarea {...field} {...form.register('description')} rows={3} />}
        </Field>
        {!teacher && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{t('teachers.assignSubjects')}</legend>
            <Controller
              control={form.control}
              name="subjectIds"
              render={({ field }) => (
                <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
                  {subjects.data?.map((subject) => (
                    <Checkbox
                      key={subject.id}
                      label={`${subject.name} — ${subject.grade?.name ?? ''}`}
                      checked={field.value.includes(subject.id)}
                      onChange={(event) =>
                        field.onChange(
                          event.target.checked
                            ? [...field.value, subject.id]
                            : field.value.filter((id) => id !== subject.id),
                        )
                      }
                    />
                  ))}
                </div>
              )}
            />
          </fieldset>
        )}
      </form>
    </Modal>
  );
}
