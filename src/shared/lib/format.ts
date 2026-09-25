import i18n from '../i18n/i18n';

function locale(): string {
  return i18n.language === 'en' ? 'en-GB' : 'ar-SY';
}

/** Western digits are used everywhere for phones, sizes and dates (clearer in dashboards). */
const NUMBERING = { numberingSystem: 'latn' } as const;

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(locale(), {
    ...NUMBERING,
    dateStyle: 'medium',
  }).format(new Date(value));
}

/** "23 أيلول" / "23 Sept" — compact axis labels. Date-only strings are treated as UTC days. */
export function formatDayMonth(value: string | Date): string {
  return new Intl.DateTimeFormat(locale(), { ...NUMBERING, day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(value),
  );
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(locale(), {
    ...NUMBERING,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale(), NUMBERING).format(value);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—';
  const units = i18n.language === 'en' ? ['B', 'KB', 'MB', 'GB', 'TB'] : ['بايت', 'ك.ب', 'م.ب', 'غ.ب', 'ت.ب'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${new Intl.NumberFormat(locale(), { ...NUMBERING, maximumFractionDigits: digits }).format(value)} ${units[unit]}`;
}

/** 3725 → "1:02:05", 125 → "2:05". */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
