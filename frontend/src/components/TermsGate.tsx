import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../state/LanguageContext';
import { ApiError } from '../api';

// Shown instead of the app to any signed-in user whose termsAcceptedVersion doesn't match the
// server's current one — every existing user the first time this feature ships, and later any
// user after a substantive terms update (see backend/src/legal.ts). Logout and the document links
// stay reachable here on purpose: a user should never be fully locked out just for not having
// acted yet.
export function TermsGate() {
  const { acceptTerms, logout } = useAuth();
  const { t } = useLanguage();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!agreed) { setError(t('termsGate.mustAgree')); return; }
    setBusy(true); setError('');
    try {
      await acceptTerms();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('termsGate.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center', padding: '0 26px 40px' }}>
      <div style={{ font: "600 24px/1.3 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.3px' }}>{t('termsGate.title')}</div>
      <div style={{ font: "400 13px/1.7 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 10 }}>
        {t('termsGate.desc')}
      </div>

      <div className="card" style={{ marginTop: 22, background: 'var(--card)' }}>
        <div onClick={() => setAgreed((v) => !v)} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, cursor: 'pointer' }}>
          <div style={{
            width: 20, height: 20, flex: 'none', marginTop: 1, borderRadius: 6,
            border: `1.5px solid ${agreed ? 'var(--accent)' : 'var(--border)'}`,
            background: agreed ? 'var(--accent)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700,
          }}>
            {agreed ? '✓' : ''}
          </div>
          <div style={{ font: "400 13.5px/1.6 'Noto Sans Hebrew',sans-serif" }}>
            {t('termsGate.agreePrefix')} <Link to="/terms" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('common.terms')}</Link>
          </div>
        </div>
        <div style={{ font: "400 12px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 12 }}>
          {t('termsGate.infoPrefix')} <Link to="/privacy" style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('common.privacy')}</Link>.
        </div>
      </div>

      {error && <div style={{ font: "500 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', marginTop: 12 }}>{error}</div>}

      <div className="btn btn-accent" style={{ marginTop: 16, textAlign: 'center', padding: 16, opacity: agreed && !busy ? 1 : 0.5, cursor: agreed ? 'pointer' : 'default' }}
        onClick={submit}>
        {t('termsGate.submit')}
      </div>
      <div className="btn btn-outline" style={{ marginTop: 10, textAlign: 'center', padding: 14 }} onClick={logout}>
        {t('termsGate.logout')}
      </div>
    </div>
  );
}
