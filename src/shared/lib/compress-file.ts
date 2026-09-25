/**
 * Makes a file smaller before upload without changing what students receive:
 * - large photos are resized (longest side 2000 px) and re-encoded in the same format;
 * - files that compress well (PDF, TXT, old Office formats) travel gzip-compressed and the server
 *   stores the original bytes. DOCX/PPTX/XLSX/ZIP/RAR are already compressed and go as they are.
 * Nothing is changed unless it saves at least 10%. Works on any site (plain HTTP too).
 */
export interface PreparedUpload {
  /** The request body: multipart form data, possibly gzip-compressed. */
  body: Blob;
  headers: Record<string, string>;
}

const GZIP_EXTENSIONS = new Set(['pdf', 'txt', 'doc', 'ppt', 'xls']);
const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  png: 'image/png',
};
const MAX_IMAGE_SIDE = 2000;
const MIN_IMAGE_BYTES = 300 * 1024;
const MIN_SAVING = 0.1;

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/** Worth sending gzip-compressed (formats that are not compressed internally). */
export function isGzipCandidate(name: string): boolean {
  return GZIP_EXTENSIONS.has(fileExtension(name));
}

/** True when `smaller` saves at least 10% over `original` bytes. */
export function savesEnough(original: number, smaller: number): boolean {
  return smaller <= original * (1 - MIN_SAVING);
}

/** Scale that brings the longest side down to 2000 px (1 = keep). */
export function imageScale(width: number, height: number): number {
  return Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height));
}

/** A resized/re-encoded photo, or the original when that would not help. */
export async function shrinkImage(file: File): Promise<File> {
  const type = IMAGE_TYPES[fileExtension(file.name)];
  if (!type || file.size < MIN_IMAGE_BYTES || typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  const scale = imageScale(bitmap.width, bitmap.height);
  // PNG is lossless: re-encoding at the same size would not make it smaller.
  if (type === 'image/png' && scale === 1) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  if (!blob || blob.type !== type || !savesEnough(file.size, blob.size)) return file;
  return new File([blob], file.name, { type, lastModified: file.lastModified });
}

export async function gzip(blob: Blob): Promise<Blob> {
  return new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob();
}

/** The multipart body for POST /files: smaller photo and/or gzip when that helps. */
export async function prepareFileUpload(file: File, title: string | null): Promise<PreparedUpload> {
  const form = new FormData();
  // Fields first, file last (streamed server-side).
  if (title) form.append('title', title);
  form.append('file', await shrinkImage(file), file.name);
  const request = new Response(form);
  const contentType = request.headers.get('content-type') ?? 'multipart/form-data';
  const body = await request.blob();
  if (isGzipCandidate(file.name) && typeof CompressionStream === 'function') {
    const compressed = await gzip(body);
    if (savesEnough(body.size, compressed.size)) {
      return { body: compressed, headers: { 'Content-Type': contentType, 'Content-Encoding': 'gzip' } };
    }
  }
  return { body, headers: { 'Content-Type': contentType } };
}
