import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { subjectsApi } from '../../api/endpoints/catalog';
import { notificationsApi } from '../../api/endpoints/people';
import { errorMessage } from '../../api/errors';
import type { NotificationAudience, SentNotification } from '../../api/types';
import { useGradeOptions, useSubjectOptions } from '../../hooks/use-lookups';
import { formatDateTime } from '../../lib/format';
import { fieldError } from '../../lib/translate';
import { requiredText } from '../../lib/validation';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { DataTable, Pagination, type Column } from '../../ui/data-table';
import { Badge, Card, CardHeader, PageHeader } from '../../ui/display';
import { Field, Input, Select, Textarea } from '../../ui/form';

const schema = z
  .object({
    title: requiredText(200),
    body: requiredText(1000),
    kind: z.enum(['ALL_STUDENTS', 'GRADE', 'SUBJECT', 'SUBJECT_TEACHER']),
    targetId: z.string(),
    subjectId: z.string(),
  })
  .refine((values) => values.kind === 'ALL_STUDENTS' || values.targetId !== '', {
    path: ['targetId'],
    message: 'validation.required',
  });
type Values = z.infer<typeof schema>;

function toAudience(values: Values): NotificationAudience {
  switch (values.kind) {
    case 'GRADE':
      return { kind: 'GRADE', gradeId: values.targetId };
    case 'SUBJECT':
      return { kind: 'SUBJECT', subjectId: values.targetId };
    case 'SUBJECT_TEACHER':
      return { kind: 'SUBJECT_TEACHER', subjectTeacherId: values.targetId };
    default:
      return { kind: 'ALL_STUDENTS' };
  }
}

function SendForm() {
  const { t } = useTranslation();
  const api = useApi();
  const queryClient = useQueryClient();
  const grades = useGradeOptions();
  const subjects = useSubjectOptions();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      body: '',
      kind: 'ALL_STUDENTS',
      targetId: '',
      subjectId: '',
    },
  });
  const kind = useWatch({ control: form.control, name: 'kind' });
  const subjectId = useWatch({ control: form.control, name: 'subjectId' });
  const subject = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => subjectsApi(api).get(subjectId),
    enabled: kind === 'SUBJECT_TEACHER' && subjectId !== '',
  });

  const send = useMutation({
    mutationFn: (values: Values) =>
      notificationsApi(api).send({
        title: values.title,
        body: values.body,
        audience: toAudience(values),
      }),
    onSuccess: () => {
      toast.success(t('notifications.sentToast'));
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Card>
      <CardHeader title={t('notifications.send')} />
      <form
        noValidate
        className="flex flex-col gap-4 p-5"
        onSubmit={(e) => void form.handleSubmit((v) => send.mutate(v))(e)}
      >
        <Field label={t('notifications.titleField')} error={fieldError(form.formState.errors.title)} required>
          {(field) => <Input {...field} {...form.register('title')} />}
        </Field>
        <Field label={t('notifications.body')} error={fieldError(form.formState.errors.body)} required>
          {(field) => <Textarea {...field} {...form.register('body')} rows={4} />}
        </Field>
        <Field label={t('notifications.audience')} required>
          {(field) => (
            <Select
              {...field}
              {...form.register('kind', {
                onChange: () => {
                  form.setValue('targetId', '');
                  form.setValue('subjectId', '');
                },
              })}
            >
              {(['ALL_STUDENTS', 'GRADE', 'SUBJECT', 'SUBJECT_TEACHER'] as const).map((value) => (
                <option key={value} value={value}>
                  {t(`notifications.audiences.${value}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {kind === 'GRADE' && (
          <Field label={t('notifications.chooseGrade')} error={fieldError(form.formState.errors.targetId)} required>
            {(field) => (
              <Select {...field} {...form.register('targetId')}>
                <option value="">{t('common.select')}</option>
                {grades.data?.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {(kind === 'SUBJECT' || kind === 'SUBJECT_TEACHER') && (
          <Field
            label={t('notifications.chooseSubject')}
            error={kind === 'SUBJECT' ? fieldError(form.formState.errors.targetId) : undefined}
            required
          >
            {(field) => (
              <Select {...field} {...form.register(kind === 'SUBJECT' ? 'targetId' : 'subjectId')}>
                <option value="">{t('common.select')}</option>
                {subjects.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.grade?.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {kind === 'SUBJECT_TEACHER' && subjectId && (
          <Field label={t('notifications.chooseTeacher')} error={fieldError(form.formState.errors.targetId)} required>
            {(field) => (
              <Select {...field} {...form.register('targetId')}>
                <option value="">{t('common.select')}</option>
                {subject.data?.teachers
                  .filter((row) => !row.archivedAt)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.teacher.name}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
        )}
        <Button type="submit" loading={send.isPending} icon={<Send className="size-4" />} className="self-start">
          {t('notifications.send')}
        </Button>
      </form>
    </Card>
  );
}

/** Notifications (spec §83): send announcements; automatic ones (new lesson/video/file) are listed too. */
export function NotificationsPage() {
  const { t } = useTranslation();
  const api = useApi();
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationsApi(api).list(page),
    placeholderData: keepPreviousData,
  });

  const columns: Column<SentNotification>[] = [
    {
      key: 'title',
      header: t('notifications.titleField'),
      cell: (row) => (
        <div>
          <p className="font-semibold">{row.title}</p>
          <p className="line-clamp-1 text-xs text-secondary">{row.body}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('common.status'),
      cell: (row) => <Badge tone="primary">{t(`notifications.types.${row.type}`)}</Badge>,
    },
    {
      key: 'sender',
      header: t('notifications.sentBy'),
      hideBelow: 'md',
      cell: (row) => row.createdBy?.name ?? t('notifications.automatic'),
    },
    {
      key: 'recipients',
      header: t('notifications.recipients'),
      cell: (row) => <span className="ltr-nums">{row.recipients}</span>,
    },
    {
      key: 'reads',
      header: t('notifications.reads'),
      hideBelow: 'md',
      cell: (row) => <span className="ltr-nums">{row.reads}</span>,
    },
    {
      key: 'date',
      header: t('common.createdAt'),
      hideBelow: 'lg',
      cell: (row) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <>
      <PageHeader title={t('notifications.title')} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[24rem_1fr]">
        <SendForm />
        <Card>
          <CardHeader title={t('notifications.sent')} />
          <DataTable
            columns={columns}
            rows={list.data?.items}
            rowKey={(row) => row.id}
            loading={list.isPending}
            error={list.error}
            onRetry={() => void list.refetch()}
            empty={{ title: t('notifications.empty') }}
          />
          {list.data && (
            <Pagination
              page={list.data.page}
              totalPages={list.data.totalPages}
              total={list.data.total}
              onPageChange={setPage}
            />
          )}
        </Card>
      </div>
    </>
  );
}
