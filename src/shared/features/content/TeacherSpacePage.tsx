import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { subjectTeachersApi, topicsApi } from '../../api/endpoints/catalog';
import type { TopicRow } from '../../api/types';
import { runAction } from '../../lib/actions';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { QueryView } from '../../ui/data-table';
import { Avatar, Badge, Card, CardHeader, PageHeader } from '../../ui/display';
import { ConfirmDialog } from '../../ui/overlay';
import { NameDescriptionModal } from '../catalog/NameDescriptionModal';
import { FilesSection } from '../files/FilesSection';
import { OrderedContentList } from './OrderedContentList';

/** A teacher's independent content space in one subject: topics ("research") and files. */
export function TeacherSpacePage() {
  const { t } = useTranslation();
  const { subjectTeacherId = '' } = useParams();
  const api = useApi();
  const topics = topicsApi(api);
  const queryClient = useQueryClient();
  const space = useQuery({
    queryKey: ['space', subjectTeacherId],
    queryFn: () => subjectTeachersApi(api).get(subjectTeacherId),
  });
  const [editing, setEditing] = useState<TopicRow | 'new' | null>(null);
  const [archiving, setArchiving] = useState<TopicRow | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ['space', subjectTeacherId],
    });
    void queryClient.invalidateQueries({ queryKey: ['subject'] });
  };

  return (
    <QueryView query={space}>
      {(data) => (
        <>
          <PageHeader
            breadcrumbs={[
              {
                label: t('content.title'),
                to: `/content?grade=${data.subject.gradeId}`,
              },
              {
                label: data.subject.name,
                to: `/content/subjects/${data.subject.id}`,
              },
              { label: data.teacher.name },
            ]}
            title={data.teacher.name}
            subtitle={data.subject.name}
            actions={
              <>
                {data.archivedAt && <Badge>{t('common.archivedBadge')}</Badge>}
                <Avatar
                  name={data.teacher.name}
                  src={data.teacher.hasImage ? `${api.baseUrl}/api/v1/media/teachers/${data.teacher.id}/image` : null}
                />
              </>
            }
          />
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader
                title={t('content.topics')}
                actions={
                  <Button
                    size="sm"
                    icon={<Plus className="size-4" />}
                    disabled={Boolean(data.archivedAt)}
                    onClick={() => setEditing('new')}
                  >
                    {t('content.addTopic')}
                  </Button>
                }
              />
              <OrderedContentList
                items={data.topics}
                linkTo={(topic) => `/content/topics/${topic.id}`}
                meta={(topic) => t('content.sessionsCount', { count: topic.sessionsCount })}
                emptyTitle={t('content.noTopics')}
                onReorder={(ids) => runAction(() => topics.reorder(subjectTeacherId, ids), undefined, refresh)}
                onEdit={setEditing}
                onArchive={setArchiving}
                onRestore={(topic) => runAction(() => topics.restore(topic.id), t('common.saved'), refresh)}
              />
            </Card>
            <FilesSection scope="TEACHER" parentId={subjectTeacherId} title={t('content.teacherFiles')} />
          </div>
          <NameDescriptionModal
            open={editing !== null}
            onOpenChange={(open) => !open && setEditing(null)}
            title={editing === 'new' ? t('content.addTopic') : t('content.editTopic')}
            nameLabel={t('content.topicTitle')}
            initial={
              editing && editing !== 'new' ? { name: editing.title, description: editing.description } : undefined
            }
            onSubmit={({ name, description }) =>
              (editing && editing !== 'new'
                ? topics.update(editing.id, { title: name, description })
                : topics.create({ subjectTeacherId, title: name, description })
              ).then(refresh)
            }
          />
          <ConfirmDialog
            open={archiving !== null}
            onOpenChange={(open) => !open && setArchiving(null)}
            title={`${t('common.archive')}: ${archiving?.title ?? ''}`}
            body={t('content.archiveConfirm')}
            confirmLabel={t('common.archive')}
            onConfirm={() => topics.archive(archiving!.id).then(refresh)}
          />
        </>
      )}
    </QueryView>
  );
}
