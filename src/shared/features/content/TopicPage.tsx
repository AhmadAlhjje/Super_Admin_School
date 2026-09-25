import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { sessionsApi, topicsApi } from '../../api/endpoints/catalog';
import type { SessionRow } from '../../api/types';
import { runAction } from '../../lib/actions';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { QueryView } from '../../ui/data-table';
import { Badge, Card, CardHeader, PageHeader } from '../../ui/display';
import { ConfirmDialog } from '../../ui/overlay';
import { NameDescriptionModal } from '../catalog/NameDescriptionModal';
import { FilesSection } from '../files/FilesSection';
import { OrderedContentList } from './OrderedContentList';

/** A topic: its sessions and topic-level files. */
export function TopicPage() {
  const { t } = useTranslation();
  const { topicId = '' } = useParams();
  const api = useApi();
  const sessions = sessionsApi(api);
  const queryClient = useQueryClient();
  const topic = useQuery({
    queryKey: ['topic', topicId],
    queryFn: () => topicsApi(api).get(topicId),
  });
  const [editing, setEditing] = useState<SessionRow | 'new' | null>(null);
  const [editingTopic, setEditingTopic] = useState(false);
  const [archiving, setArchiving] = useState<SessionRow | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
    void queryClient.invalidateQueries({ queryKey: ['space'] });
  };

  return (
    <QueryView query={topic}>
      {(data) => {
        const space = data.subjectTeacher;
        return (
          <>
            <PageHeader
              breadcrumbs={[
                {
                  label: t('content.title'),
                  to: `/content?grade=${space.subject.gradeId}`,
                },
                {
                  label: space.subject.name,
                  to: `/content/subjects/${space.subject.id}`,
                },
                {
                  label: space.teacher.name,
                  to: `/content/spaces/${space.id}`,
                },
                { label: data.title },
              ]}
              title={data.title}
              subtitle={data.description ?? undefined}
              actions={
                <>
                  {data.archivedAt && <Badge>{t('common.archivedBadge')}</Badge>}
                  <Button variant="outline" icon={<Pencil className="size-4" />} onClick={() => setEditingTopic(true)}>
                    {t('common.edit')}
                  </Button>
                </>
              }
            />
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader
                  title={t('content.sessions')}
                  actions={
                    <Button
                      size="sm"
                      icon={<Plus className="size-4" />}
                      disabled={Boolean(data.archivedAt)}
                      onClick={() => setEditing('new')}
                    >
                      {t('content.addSession')}
                    </Button>
                  }
                />
                <OrderedContentList
                  items={data.sessions}
                  linkTo={(session) => `/content/sessions/${session.id}`}
                  meta={(session) =>
                    `${t('content.videosCount', { count: session.videosCount })} · ${t('content.filesCount', { count: session.filesCount })}`
                  }
                  emptyTitle={t('content.noSessions')}
                  onReorder={(ids) => runAction(() => sessions.reorder(topicId, ids), undefined, refresh)}
                  onEdit={setEditing}
                  onArchive={setArchiving}
                  onRestore={(session) => runAction(() => sessions.restore(session.id), t('common.saved'), refresh)}
                />
              </Card>
              <FilesSection scope="TOPIC" parentId={topicId} title={t('content.topicFiles')} />
            </div>
            <NameDescriptionModal
              open={editing !== null}
              onOpenChange={(open) => !open && setEditing(null)}
              title={editing === 'new' ? t('content.addSession') : t('content.editSession')}
              nameLabel={t('content.sessionTitle')}
              initial={
                editing && editing !== 'new' ? { name: editing.title, description: editing.description } : undefined
              }
              onSubmit={({ name, description }) =>
                (editing && editing !== 'new'
                  ? sessions.update(editing.id, { title: name, description })
                  : sessions.create({ topicId, title: name, description })
                ).then(refresh)
              }
            />
            <NameDescriptionModal
              open={editingTopic}
              onOpenChange={setEditingTopic}
              title={t('content.editTopic')}
              nameLabel={t('content.topicTitle')}
              initial={{ name: data.title, description: data.description }}
              onSubmit={({ name, description }) =>
                topicsApi(api).update(topicId, { title: name, description }).then(refresh)
              }
            />
            <ConfirmDialog
              open={archiving !== null}
              onOpenChange={(open) => !open && setArchiving(null)}
              title={`${t('common.archive')}: ${archiving?.title ?? ''}`}
              body={t('content.archiveConfirm')}
              confirmLabel={t('common.archive')}
              onConfirm={() => sessions.archive(archiving!.id).then(refresh)}
            />
          </>
        );
      }}
    </QueryView>
  );
}
