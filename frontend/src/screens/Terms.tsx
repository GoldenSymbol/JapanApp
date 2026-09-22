import { LegalPage } from '../components/LegalPage';
import { TERMS_SECTIONS, TERMS_VERSION, TERMS_UPDATED } from '../legal/content';
import { useLanguage } from '../state/LanguageContext';

export function Terms() {
  const { t, lang } = useLanguage();
  return <LegalPage title={t('legal.termsTitle')} version={TERMS_VERSION} updated={TERMS_UPDATED} sections={TERMS_SECTIONS[lang]} />;
}
