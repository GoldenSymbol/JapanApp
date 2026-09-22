import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../state/LanguageContext';
import { ApiError } from '../api';

export function Signup() {
  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !password) { setError(t('signup.missingFields')); return; }
    if (!agreedToTerms) { setError(t('signup.mustAgree')); return; }
    setError(''); setBusy(true);
    try {
      await signup(name.trim(), email.trim(), password);
      navigate('/choose');
    } catch (e) {
      if (e instanceof ApiError) {
        const code = e.payload?.error;
        setError(code && (code.startsWith('auth/') || code === 'weak_password') ? t(`authError.${code}`) : e.message || t('signup.genericError'));
      } else {
        setError(t('signup.genericError'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center', padding: '0 26px 40px' }}>
      <Link to="/login" style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', padding: '8px 0' }}>{t('common.back')}</Link>
      <div style={{ font: "600 27px/1.25 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.4px', marginTop: 20 }}>{t('signup.title')}</div>
      <div style={{ marginTop: 26 }}>
        <div className="section-label" style={{ paddingBottom: 9 }}>{t('signup.name')}</div>
        <input className="field" placeholder={t('signup.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ marginTop: 14 }}>
        <div className="section-label" style={{ paddingBottom: 9 }}>{t('login.email')}</div>
        <input className="field" style={{ direction: 'ltr', textAlign: 'left' }} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div style={{ marginTop: 14 }}>
        <div className="section-label" style={{ paddingBottom: 9 }}>{t('login.password')}</div>
        <input className="field" style={{ direction: 'ltr', textAlign: 'left' }} type="password" placeholder={t('signup.passwordPlaceholder')} value={password}
          onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </div>
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }} onClick={() => setAgreedToTerms((v) => !v)}>
        <div style={{
          width: 19, height: 19, flex: 'none', marginTop: 1, borderRadius: 6,
          border: `1.5px solid ${agreedToTerms ? 'var(--accent)' : 'var(--border)'}`,
          background: agreedToTerms ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700,
        }}>
          {agreedToTerms ? '✓' : ''}
        </div>
        <div style={{ font: "400 12.5px/1.6 'Noto Sans Hebrew',sans-serif" }}>
          {t('signup.agreePrefix')} <Link to="/terms" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('common.terms')}</Link>
        </div>
      </div>
      <div style={{ font: "400 11.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 8 }}>
        {t('signup.privacyNotePrefix')}
        <Link to="/privacy" style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('common.privacy')}</Link>.
      </div>

      {error && <div style={{ font: "500 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', marginTop: 12 }}>{error}</div>}
      <div className="btn btn-accent" style={{ marginTop: 16, textAlign: 'center', padding: 16, opacity: busy ? 0.6 : 1 }} onClick={submit}>
        {t('signup.submit')}
      </div>
    </div>
  );
}
