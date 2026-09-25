import { z } from 'zod';

/**
 * Client-side validation mirroring the backend rules (the backend remains the authority).
 * Error messages are i18n keys resolved by the form components.
 */

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

export function normalizePhone(raw: string): string {
  let value = raw
    .trim()
    .replace(ARABIC_DIGITS, (char) => {
      const code = char.charCodeAt(0);
      return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
    })
    .replace(/[\s\-.()‎‏]/g, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  return value;
}

export const PHONE_PATTERN = /^\+?\d{8,15}$/;

export function isStrongPassword(value: string): boolean {
  return value.length >= 8 && value.length <= 128 && /\p{L}/u.test(value) && /\p{Nd}/u.test(value);
}

export const phoneField = () =>
  z
    .string()
    .min(1, 'validation.required')
    .transform(normalizePhone)
    .refine((value) => PHONE_PATTERN.test(value), 'validation.phone');

export const strongPasswordField = () =>
  z.string().min(1, 'validation.required').refine(isStrongPassword, 'validation.passwordWeak');

export const requiredText = (max = 120) =>
  z.string().trim().min(1, 'validation.required').max(max, 'validation.tooLong');

export const optionalText = (max = 5000) => z.string().trim().max(max, 'validation.tooLong').optional();
