import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';

/** Toggles Arabic ⇄ English; the document direction follows automatically (see i18n.ts). */
export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
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
