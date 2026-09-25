import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ar } from './locales/ar';
import { en } from './locales/en';
// Type-safe translation keys for every consumer of this module.
import type {} from './i18next-types';

/**
 * First release: Arabic only — the language button is hidden and saved choices are ignored. The
 * English translations stay; set this to true to offer English again.
 */
export const ENGLISH_ENABLED = false;

export const SUPPORTED_LANGUAGES = ['ar', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'edu.language';

function initialLanguage(): Language {
  if (!ENGLISH_ENABLED) return 'ar';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {
    // storage unavailable (private mode) — use the default
  }
  return 'ar';
}

/** Keeps <html lang dir> in sync so the whole layout flips between RTL and LTR. */
function applyDocumentDirection(language: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
}

void i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: initialLanguage(),
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDocumentDirection(i18n.language);
i18n.on('languageChanged', (language) => {
  applyDocumentDirection(language);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // ignore
  }
});

export default i18n;
