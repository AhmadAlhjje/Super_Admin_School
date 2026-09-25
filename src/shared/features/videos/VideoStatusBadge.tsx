import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VideoDisplayStatus } from '../../api/types';
import { Badge } from '../../ui/display';

/** The only three states users see (spec §81): uploading, ready, failed — with icon + text. */
export function VideoStatusBadge({ status }: { status: VideoDisplayStatus }) {
  const { t } = useTranslation();
  if (status === 'READY') {
    return (
      <Badge tone="success">
        <CheckCircle2 className="size-3.5" aria-hidden /> {t('videos.ready')}
      </Badge>
    );
  }
  if (status === 'FAILED') {
    return (
      <Badge tone="danger">
        <XCircle className="size-3.5" aria-hidden /> {t('videos.failed')}
      </Badge>
    );
  }
  return (
    <Badge tone="primary">
      <Loader2 className="size-3.5 animate-spin" aria-hidden /> {t('videos.uploadingShort')}
    </Badge>
  );
}
