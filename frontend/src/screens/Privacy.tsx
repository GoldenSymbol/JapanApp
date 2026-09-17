import { LegalPage } from '../components/LegalPage';
import { PRIVACY_SECTIONS, PRIVACY_VERSION, PRIVACY_UPDATED } from '../legal/content';

export function Privacy() {
  return <LegalPage title="מדיניות פרטיות" version={PRIVACY_VERSION} updated={PRIVACY_UPDATED} sections={PRIVACY_SECTIONS} />;
}
