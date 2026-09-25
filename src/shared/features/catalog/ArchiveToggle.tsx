import { useTranslation } from 'react-i18next';
import { Checkbox } from '../../ui/form';

/** "Show archived" filter used by every archivable list. */
export function ArchiveToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const { t } = useTranslation();
  return <Checkbox label={t('common.showArchived')} checked={checked} onChange={(e) => onChange(e.target.checked)} />;
}
