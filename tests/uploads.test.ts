// @vitest-environment node
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeUploadId, encodeUploadId } from '../src/shared/features/uploads/background';
import { runPool } from '../src/shared/lib/pool';
import { imageScale, isGzipCandidate, prepareFileUpload, savesEnough } from '../src/shared/lib/compress-file';
import { outputSize, targetVideoBitrate, worthCompressing } from '../src/shared/lib/compress-video';

describe('video compression decisions', () => {
  it('keeps the aspect ratio, caps at 720 lines and uses even sizes', () => {
    expect(outputSize(3840, 2160)).toEqual({ width: 1280, height: 720 });
    expect(outputSize(1920, 1080)).toEqual({ width: 1280, height: 720 });
    expect(outputSize(1280, 720)).toEqual({ width: 1280, height: 720 });
    expect(outputSize(1080, 1920)).toEqual({ width: 406, height: 720 });
    expect(outputSize(853, 481)).toEqual({ width: 854, height: 482 });
  });

  it('targets a lesson-friendly bitrate per height', () => {
    expect(targetVideoBitrate(1080)).toBe(3_000_000);
    expect(targetVideoBitrate(720)).toBe(1_800_000);
    expect(targetVideoBitrate(360)).toBe(700_000);
  });

  it('compresses only videos clearly heavier than the target', () => {
    const minute = 60;
    // A phone recording: 1 minute at ~16 Mbit/s.
    expect(worthCompressing(120_000_000, minute, 3_000_000)).toBe(true);
    // Already exported for the web: ~3 Mbit/s.
    expect(worthCompressing(23_000_000, minute, 3_000_000)).toBe(false);
    expect(worthCompressing(1_000_000, 0, 3_000_000)).toBe(false);
  });
});

describe('file compression decisions', () => {
  it('gzips only formats that are not already compressed', () => {
    expect(isGzipCandidate('ملخص.PDF')).toBe(true);
    expect(isGzipCandidate('notes.txt')).toBe(true);
    expect(isGzipCandidate('slides.pptx')).toBe(false);
    expect(isGzipCandidate('archive.zip')).toBe(false);
    expect(savesEnough(100, 90)).toBe(true);
    expect(savesEnough(100, 95)).toBe(false);
    expect(imageScale(4000, 3000)).toBe(0.5);
    expect(imageScale(800, 600)).toBe(1);
  });

  it('sends a compressible file gzip-compressed, with the original bytes inside', async () => {
    const text = 'درس التفاضل — ملاحظات\n'.repeat(5000);
    const file = new File([text], 'notes.txt', { type: 'text/plain' });
    const prepared = await prepareFileUpload(file, 'ملاحظات');
    expect(prepared.headers['Content-Encoding']).toBe('gzip');
    expect(prepared.headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
    expect(prepared.body.size).toBeLessThan(file.size / 10);
    const multipart = gunzipSync(Buffer.from(await prepared.body.arrayBuffer())).toString('utf8');
    expect(multipart).toContain('name="title"');
    expect(multipart).toContain('filename="notes.txt"');
    expect(multipart).toContain(text);
  });

  it('sends already-compressed formats as they are', async () => {
    const file = new File([new Uint8Array(4096).map((_, i) => (i * 7919) % 251)], 'slides.pptx');
    const prepared = await prepareFileUpload(file, null);
    expect(prepared.headers['Content-Encoding']).toBeUndefined();
    expect(prepared.body.size).toBeGreaterThan(file.size);
  });
});

describe('background upload ids', () => {
  it('round-trips videos and files (titles in Arabic, tokens with dots)', () => {
    const video = { kind: 'video', videoId: '0190-v', token: 'aaa.bbb.ccc' } as const;
    expect(decodeUploadId(encodeUploadId(video, 1))).toEqual(video);
    const file = {
      kind: 'file',
      scope: 'SESSION',
      parentId: '0190-s',
      title: 'ملخص | الجلسة الأولى',
      token: 'x.y.z',
    } as const;
    expect(decodeUploadId(encodeUploadId(file, 2))).toEqual(file);
    expect(decodeUploadId('something-else')).toBeNull();
  });
});

describe('parallel uploads', () => {
  it('runs at most N tasks at a time and stops at the first failure', async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await runPool([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, async (item) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      done.push(item);
      running -= 1;
    });
    expect(peak).toBe(4);
    expect(done.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const started: number[] = [];
    await expect(
      runPool([1, 2, 3, 4, 5, 6, 7, 8], 2, async (item) => {
        started.push(item);
        await Promise.resolve();
        if (item === 2) throw new Error('network');
      }),
    ).rejects.toThrow('network');
    expect(started.length).toBeLessThan(8);
  });
});
