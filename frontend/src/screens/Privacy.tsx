import { LegalPage } from '../components/LegalPage';
import { PRIVACY_SECTIONS, PRIVACY_VERSION, PRIVACY_UPDATED } from '../legal/content';
import { useLanguage } from '../state/LanguageContext';

export function Privacy() {
  const { t, lang } = useLanguage();
  return <LegalPage title={t('legal.privacyTitle')} version={PRIVACY_VERSION} updated={PRIVACY_UPDATED} sections={PRIVACY_SECTIONS[lang]} />;
}
