import 'i18next';
import type { Translation } from './locales/ar';

/** Type-safe translation keys: t('students.title') is checked at compile time. */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Translation };
    returnNull: false;
  }
}

export {};
