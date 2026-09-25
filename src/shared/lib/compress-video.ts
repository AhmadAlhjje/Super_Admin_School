/**
 * Compresses a lesson video in the browser before upload, so it uploads faster: H.264 in MP4, at
 * most 720p and 30 fps, at a bitrate suited to lessons, with a key frame every 2 s. That is what
 * the server's largest quality needs, so the server takes it as it is and only prepares the
 * smaller quality — processing is faster too. Written to the browser's private disk storage,
 * never held in memory.
 *
 * It uses the browser's video encoder (WebCodecs), which browsers only offer on HTTPS sites (and
 * localhost). Elsewhere — and whenever compressing would not make the file clearly smaller, or
 * would lose the sound — the original file is uploaded unchanged.
 */
const MAX_HEIGHT = 720;
const MAX_FRAME_RATE = 30;
/** Seconds between key frames: the server cuts 6-second segments. */
const KEY_FRAME_INTERVAL = 2;
const AUDIO_BITRATE = 128_000;
const MIN_SAVING = 0.15;
const TEMP_PREFIX = 'compressed-';

export function videoCompressionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'VideoEncoder' in window &&
    typeof navigator.storage?.getDirectory === 'function'
  );
}

/** Video bitrate (bits/s) for an output height: clear for lessons, light to upload. */
export function targetVideoBitrate(height: number): number {
  if (height <= 360) return 700_000;
  if (height <= 480) return 1_000_000;
  if (height <= 720) return 1_800_000;
  return 3_000_000;
}

/** Output size: the same aspect ratio, at most 720 lines, even dimensions (encoder requirement). */
export function outputSize(width: number, height: number): { width: number; height: number } {
  const outHeight = Math.min(height, MAX_HEIGHT);
  const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  return { width: even((width * outHeight) / height), height: even(outHeight) };
}

/** Worth compressing: the source is clearly heavier than the target. */
export function worthCompressing(fileBytes: number, durationSeconds: number, targetBitrate: number): boolean {
  if (!(durationSeconds > 0)) return false;
  return (fileBytes * 8) / durationSeconds > (targetBitrate + AUDIO_BITRATE) * (1 + MIN_SAVING);
}

export interface CompressedVideo {
  file: File;
  /** Deletes the compressed copy once it has been uploaded. */
  dispose: () => Promise<void>;
}

/** Why the original was uploaded instead (visible in the browser console, for support). */
function skip(reason: string, detail?: unknown): null {
  // eslint-disable-next-line no-console -- tells support why a video was uploaded uncompressed
  console.warn(`Video not compressed: ${reason}`, detail ?? '');
  return null;
}

/** The compressed video (named `<name>.mp4`), or `null` to upload the original. */
export async function compressVideo(
  file: File,
  onProgress: (percent: number) => void,
): Promise<CompressedVideo | null> {
  if (!videoCompressionSupported()) return null;
  const mb = await import('mediabunny');
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  let tempName: string | null = null;
  const directory = await navigator.storage.getDirectory();
  const removeTemp = async () => {
    if (tempName) await directory.removeEntry(tempName).catch(() => undefined);
  };
  try {
    const video = await input.getPrimaryVideoTrack();
    if (!video) return skip('no video track');
    const duration = await input.computeDuration();
    const size = outputSize(video.displayWidth, video.displayHeight);
    const bitrate = targetVideoBitrate(size.height);
    if (!worthCompressing(file.size, duration, bitrate)) return skip('already light enough');
    const sourceFrameRate = (await video.computePacketStats(120)).averagePacketRate;
    if (!(await mb.canEncodeVideo('avc', { ...size, bitrate }))) return skip('no H.264 encoder', size);

    tempName = `${TEMP_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
    const handle = await directory.getFileHandle(tempName, { create: true });
    const output = new mb.Output({
      format: new mb.Mp4OutputFormat({ fastStart: false }),
      target: new mb.StreamTarget(await handle.createWritable(), { chunked: true }),
    });
    const conversion = await mb.Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: {
        codec: 'avc',
        height: size.height,
        quality: new mb.Quality({ bitrate, bitrateMode: 'variable' }),
        keyFrameInterval: KEY_FRAME_INTERVAL,
        ...(sourceFrameRate > MAX_FRAME_RATE + 1 ? { frameRate: MAX_FRAME_RATE } : {}),
        forceTranscode: true,
      },
    });
    // Never upload a lesson without its sound (or without its picture).
    const lost = conversion.discardedTracks.some(({ track }) => track.isVideoTrack() || track.isAudioTrack());
    if (!conversion.isValid || lost) {
      await conversion.cancel().catch(() => undefined);
      await removeTemp();
      return skip('a track cannot be converted', conversion.discardedTracks);
    }
    conversion.onProgress = (progress) => onProgress(Math.min(100, progress * 100));
    await conversion.execute();

    const compressed = await handle.getFile();
    if (compressed.size > file.size * (1 - MIN_SAVING)) {
      await removeTemp();
      return skip('not smaller enough', { before: file.size, after: compressed.size });
    }
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'video'}.mp4`;
    return {
      file: new File([compressed], name, { type: 'video/mp4', lastModified: Date.now() }),
      dispose: removeTemp,
    };
  } catch (error) {
    // Unsupported source or encoder failure: the original is uploaded instead.
    await removeTemp();
    return skip('conversion failed', error);
  } finally {
    input.dispose();
  }
}

/** Removes compressed copies left behind (e.g. the tab closed while compressing). */
export async function removeCompressedLeftovers(): Promise<void> {
  if (typeof navigator.storage?.getDirectory !== 'function') return;
  try {
    const directory = await navigator.storage.getDirectory();
    const names: string[] = [];
    for await (const name of (directory as unknown as { keys(): AsyncIterable<string> }).keys()) {
      if (name.startsWith(TEMP_PREFIX)) names.push(name);
    }
    await Promise.all(names.map((name) => directory.removeEntry(name).catch(() => undefined)));
  } catch {
    // Storage unavailable: nothing to clean.
  }
}
