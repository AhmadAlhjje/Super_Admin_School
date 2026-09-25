import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ENGLISH_ENABLED } from '../i18n/i18n';
import { Button } from '../ui/button';

/**
 * Toggles Arabic ⇄ English; the document direction follows automatically (see i18n.ts).
 * Hidden while English is turned off (first release).
 */
export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  if (!ENGLISH_ENABLED) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      icon={<Languages className="size-4" aria-hidden />}
      onClick={() => void i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
    >
      {t('common.language')}
    </Button>
  );
}
