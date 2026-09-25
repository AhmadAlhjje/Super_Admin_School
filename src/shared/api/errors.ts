import { isAxiosError } from 'axios';
import type { TFunction } from 'i18next';
import i18n from '../i18n/i18n';

/** Normalized API failure: the backend `error.code` plus HTTP status and details. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorEnvelope {
  success: false;
  message?: string;
  error?: { code?: string; details?: unknown };
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError<ErrorEnvelope>(error)) {
    if (!error.response) return new ApiError('NETWORK', 0, error.message);
    const envelope = error.response.data;
    const code = envelope?.error?.code ?? 'UNKNOWN';
    return new ApiError(code, error.response.status, envelope?.message ?? code, envelope?.error?.details ?? null);
  }
  return new ApiError('UNKNOWN', 0, error instanceof Error ? error.message : String(error));
}

/** Localized, user-facing message for any error (never technical details). */
export function errorMessage(error: unknown, t: TFunction = i18n.t): string {
  const apiError = toApiError(error);
  const key = `errors.${apiError.code}`;
  if (i18n.exists(key)) return (t as unknown as (k: string) => string)(key);
  return t('errors.UNKNOWN');
}
