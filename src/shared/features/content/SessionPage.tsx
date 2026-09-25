import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, PlayCircle, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { sessionsApi } from '../../api/endpoints/catalog';
import { videosApi } from '../../api/endpoints/media';
import type { Video } from '../../api/types';
import { deletedWithUndo, runAction } from '../../lib/actions';
import { formatDuration } from '../../lib/format';
import { useApi } from '../../platform/platform-context';
import { Button } from '../../ui/button';
import { ActionsMenu, moveItem, ReorderButtons } from '../../ui/controls';
import { QueryView } from '../../ui/data-table';
import { Badge, Card, CardHeader, PageHeader } from '../../ui/display';
import { EmptyState } from '../../ui/feedback';
import { ConfirmDialog } from '../../ui/overlay';
import { NameDescriptionModal } from '../catalog/NameDescriptionModal';
import { FilesSection } from '../files/FilesSection';
import { PreparingStatus, UploadTaskStatus } from '../uploads/UploadsPanel';
import { useUploads } from '../uploads/upload-manager';
import { VideoPreviewModal } from '../videos/VideoPreviewModal';
import { VideoStatusBadge } from '../videos/VideoStatusBadge';
import { VideoUploadModal } from '../videos/VideoUploadModal';

function VideoRowStatus({ video, onPickFile }: { video: Video; onPickFile: () => void }) {
  const { t } = useTranslation();
  const { tasks } = useUploads();
  const task = [...tasks].reverse().find((item) => item.videoId === video.id);
  if (task && task.phase !== 'done') return <UploadTaskStatus task={task} />;
  // Uploaded (maybe from another computer): the server is preparing it.
  const preparing = video.upload?.preparingPercent;
  if (video.displayStatus === 'UPLOADING' && preparing !== null && preparing !== undefined) {
    return <PreparingStatus percent={preparing} />;
  }
  if (video.displayStatus === 'FAILED') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span role="alert" className="text-sm font-semibold text-danger">
          ✕ {t('videos.uploadFailed')}
        </span>
        <Button size="sm" variant="outline" icon={<RotateCcw className="size-4" />} onClick={onPickFile}>
          {t('videos.retry')}
        </Button>
      </div>
    );
  }
  // An upload that stopped before completion (tab closed, network lost) can be resumed.
  if (video.displayStatus === 'UPLOADING' && video.upload?.status === 'UPLOADING') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <VideoStatusBadge status="UPLOADING" />
        <Button
          size="sm"
          variant="outline"
          icon={<Upload className="size-4" />}
          onClick={onPickFile}
          title={t('videos.resumeHint')}
        >
          {t('videos.resume')}
        </Button>
      </div>
    );
  }
  return <VideoStatusBadge status={video.displayStatus} />;
}

/** A session: its videos (upload, status, preview, order) and files (spec §74). */
export function SessionPage() {
  const { t } = useTranslation();
  const { sessionId = '' } = useParams();
  const api = useApi();
  const videos = videosApi(api);
  const queryClient = useQueryClient();
  const { resume } = useUploads();
  const fileInput = useRef<HTMLInputElement>(null);
  const [resuming, setResuming] = useState<Video | null>(null);
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState<Video | null>(null);
  const [archiving, setArchiving] = useState<Video | null>(null);
  const [preview, setPreview] = useState<Video | null>(null);
  const [editingSession, setEditingSession] = useState(false);

  const session = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionsApi(api).get(sessionId),
    // Keep statuses fresh while something is still being uploaded/prepared.
    refetchInterval: (query) =>
      query.state.data?.videos.some((video) => video.displayStatus === 'UPLOADING') ? 5000 : false,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['session', sessionId] });

  const pickFileFor = (video: Video) => {
    setResuming(video);
    fileInput.current?.click();
  };

  return (
    <QueryView query={session}>
      {(data) => {
        const space = data.topic.subjectTeacher;
        const active = data.videos.filter((video) => !video.archivedAt);
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
                {
                  label: data.topic.title,
                  to: `/content/topics/${data.topic.id}`,
                },
                { label: data.title },
              ]}
              title={data.title}
              subtitle={data.description ?? undefined}
              actions={
                <>
                  {data.archivedAt && <Badge>{t('common.archivedBadge')}</Badge>}
                  <Button
                    variant="outline"
                    icon={<Pencil className="size-4" />}
                    onClick={() => setEditingSession(true)}
                  >
                    {t('common.edit')}
                  </Button>
                </>
              }
            />
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader
                  title={t('content.videos')}
                  actions={
                    <Button
                      size="sm"
                      icon={<Upload className="size-4" />}
                      disabled={Boolean(data.archivedAt)}
                      onClick={() => setUploading(true)}
                    >
                      {t('videos.upload')}
                    </Button>
                  }
                />
                {active.length === 0 ? (
                  <EmptyState title={t('content.noVideos')} />
                ) : (
                  <ul className="divide-y divide-border">
                    {active.map((video, index) => (
                      <li key={video.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                        <ReorderButtons
                          index={index}
                          count={active.length}
                          onMove={(from, to) =>
                            runAction(
                              () =>
                                videos.reorder(
                                  sessionId,
                                  moveItem(active, from, to).map((item) => item.id),
                                ),
                              undefined,
                              refresh,
                            )
                          }
                        />
                        <PlayCircle className="size-5 shrink-0 text-primary" aria-hidden />
                        <div className="min-w-40 flex-1">
                          <p className="font-semibold text-text">{video.title}</p>
                          {video.durationSeconds ? (
                            <p className="text-xs text-secondary ltr-nums">{formatDuration(video.durationSeconds)}</p>
                          ) : null}
                        </div>
                        <div className="w-full sm:w-64">
                          <VideoRowStatus video={video} onPickFile={() => pickFileFor(video)} />
                        </div>
                        <ActionsMenu
                          actions={[
                            {
                              label: t('common.preview'),
                              icon: <PlayCircle className="size-4" />,
                              hidden: video.displayStatus !== 'READY',
                              onSelect: () => setPreview(video),
                            },
                            {
                              label: t('videos.rename'),
                              icon: <Pencil className="size-4" />,
                              onSelect: () => setRenaming(video),
                            },
                            {
                              label: t('common.archive'),
                              icon: <Trash2 className="size-4" />,
                              tone: 'danger',
                              onSelect: () => setArchiving(video),
                            },
                          ]}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <FilesSection scope="SESSION" parentId={sessionId} title={t('content.sessionFiles')} />
            </div>

            <input
              ref={fileInput}
              type="file"
              accept="video/*,.mp4,.m4v,.mov,.mkv,.webm,.avi"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && resuming) resume(resuming, file);
                setResuming(null);
                event.target.value = '';
              }}
            />
            <VideoUploadModal open={uploading} onOpenChange={setUploading} sessionId={sessionId} />
            <VideoPreviewModal
              videoId={preview?.id ?? null}
              title={preview?.title ?? ''}
              onClose={() => setPreview(null)}
            />
            <NameDescriptionModal
              open={renaming !== null}
              onOpenChange={(open) => !open && setRenaming(null)}
              title={t('videos.rename')}
              nameLabel={t('videos.title')}
              withDescription={false}
              initial={renaming ? { name: renaming.title, description: null } : undefined}
              onSubmit={({ name }) => videos.update(renaming!.id, { title: name }).then(refresh)}
            />
            <NameDescriptionModal
              open={editingSession}
              onOpenChange={setEditingSession}
              title={t('content.editSession')}
              nameLabel={t('content.sessionTitle')}
              initial={{ name: data.title, description: data.description }}
              onSubmit={({ name, description }) =>
                sessionsApi(api).update(sessionId, { title: name, description }).then(refresh)
              }
            />
            <ConfirmDialog
              open={archiving !== null}
              onOpenChange={(open) => !open && setArchiving(null)}
              title={`${t('common.archive')}: ${archiving?.title ?? ''}`}
              body={t('content.archiveConfirm')}
              confirmLabel={t('common.archive')}
              onConfirm={() => {
                const video = archiving!;
                return videos.archive(video.id).then(() => {
                  refresh();
                  deletedWithUndo(t('common.deletedDone'), t('common.undo'), () => videos.restore(video.id), refresh);
                });
              }}
            />
          </>
        );
      }}
    </QueryView>
  );
}
