import type { FieldError } from 'react-hook-form';
import i18n from '../i18n/i18n';

/**
 * Translates a key that is only known at runtime (validation message keys, enum values from the
 * API such as audit actions). Unknown keys fall back to the provided text or the key itself.
 */
export function translateKey(key: string, fallback?: string, options?: Record<string, unknown>): string {
  if (!i18n.exists(key)) return fallback ?? key;
  return (i18n.t as unknown as (k: string, o?: Record<string, unknown>) => string)(key, options);
}

/** Localized message for a react-hook-form field error whose message is an i18n key. */
export function fieldError(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;
  return translateKey(error.message ?? 'validation.required');
}
