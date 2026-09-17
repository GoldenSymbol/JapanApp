import { LegalPage } from '../components/LegalPage';
import { TERMS_SECTIONS, TERMS_VERSION, TERMS_UPDATED } from '../legal/content';

export function Terms() {
  return <LegalPage title="תנאי שימוש" version={TERMS_VERSION} updated={TERMS_UPDATED} sections={TERMS_SECTIONS} />;
}
