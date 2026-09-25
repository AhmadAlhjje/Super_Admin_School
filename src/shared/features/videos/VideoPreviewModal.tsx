import type Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { videosApi } from '../../api/endpoints/media';
import { errorMessage } from '../../api/errors';
import { useApi } from '../../platform/platform-context';
import { Spinner } from '../../ui/feedback';
import { Modal } from '../../ui/overlay';

/** Mounted per video (keyed), so its loading/error state always starts fresh. */
function PreviewPlayer({ videoId }: { videoId: string }) {
  const { t } = useTranslation();
  const api = useApi();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let hls: Hls | null = null;
    let cancelled = false;
    // hls.js is loaded only when a preview is opened.
    Promise.all([videosApi(api).preview(videoId), import('hls.js')])
      .then(([grant, { default: HlsPlayer }]) => {
        const element = videoRef.current;
        if (cancelled || !element) return;
        if (HlsPlayer.isSupported()) {
          hls = new HlsPlayer();
          hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
            if (data.fatal) setError(t('videos.previewError'));
          });
          hls.loadSource(grant.manifestUrl);
          hls.attachMedia(element);
        } else if (element.canPlayType('application/vnd.apple.mpegurl')) {
          element.src = grant.manifestUrl;
        } else {
          setError(t('videos.previewError'));
        }
      })
      .catch((reason: unknown) => setError(errorMessage(reason)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [api, t, videoId]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-text">
      <video
        ref={videoRef}
        controls
        controlsList="nodownload"
        className="size-full"
        onContextMenu={(e) => e.preventDefault()}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner className="text-white" />
        </div>
      )}
      {error && (
        <p role="alert" className="absolute inset-x-0 bottom-0 bg-danger px-4 py-2 text-center text-sm text-white">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Staff preview of a processed video. Requests a short-lived signed manifest and plays the
 * encrypted HLS stream with hls.js (native HLS on Safari). The key is fetched by the player
 * through the authorizing key endpoint, exactly as in the student app.
 */
export function VideoPreviewModal({
  videoId,
  title,
  onClose,
}: {
  videoId: string | null;
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={videoId !== null}
      onOpenChange={(open) => !open && onClose()}
      title={title || t('videos.previewTitle')}
      size="lg"
    >
      {videoId && <PreviewPlayer key={videoId} videoId={videoId} />}
    </Modal>
  );
}
