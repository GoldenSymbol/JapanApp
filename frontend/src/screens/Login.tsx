import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../state/LanguageContext';
import { ApiError } from '../api';
import { Drawer } from '../components/Drawer';
import logo from '../assets/logo.png';
import { authErrorText } from '../utils/authErrors';

export function Login() {
  const { login, resetPassword } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotError, setForgotError] = useState('');

  async function submit() {
    if (!email.trim() || !password) { setError(t('login.missingFields')); return; }
    setError(''); setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/today');
    } catch (e) {
      if (e instanceof ApiError) {
        const code = e.payload?.error;
        setError(code && (code.startsWith('auth/') || code === 'weak_password') ? authErrorText(t, code) : e.message || t('login.genericError'));
      } else {
        setError(t('login.genericError'));
      }
    } finally {
      setBusy(false);
    }
  }

  function openForgot() {
    setForgotEmail(email);
    setForgotMsg('');
    setForgotError('');
    setForgotOpen(true);
  }

  async function submitForgot() {
    const address = forgotEmail.trim();
    if (!address) { setForgotError(t('login.forgotMissingEmail')); return; }
    if (forgotBusy) return;
    setForgotBusy(true);
    setForgotError('');
    try {
      await resetPassword(address, lang);
      setForgotMsg(t('login.forgotSuccess'));
    } catch (e: any) {
      const code: string | undefined = e?.payload?.error;
      // "No account with that email" must look exactly like success, or anyone could probe which emails
      // are registered. Real problems (bad address, no connection, too many tries) are worth telling.
      if (code === 'auth/user-not-found') setForgotMsg(t('login.forgotSuccess'));
      else setForgotError(code ? authErrorText(t, code) : t('login.genericError'));
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center', padding: '0 26px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img src={logo} alt="Japan 2027" style={{ width: 300, height: 'auto' }} />
      </div>

      <div style={{ marginTop: 30 }}>
        <div className="section-label" style={{ paddingBottom: 9 }}>{t('login.email')}</div>
        <input className="field" style={{ direction: 'ltr', textAlign: 'left' }} placeholder="you@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9 }}>
          <div className="section-label">{t('login.password')}</div>
          <div onClick={() => setShowPw((v) => !v)} style={{ font: "500 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', cursor: 'pointer' }}>
            {showPw ? t('login.hide') : t('login.show')}
          </div>
        </div>
        <input className="field" style={{ direction: 'ltr', textAlign: 'left' }} type={showPw ? 'text' : 'password'} placeholder="••••••••"
          value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <div onClick={openForgot} style={{ font: "500 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer', marginTop: 9 }}>
          {t('login.forgotPassword')}
        </div>
      </div>
      {error && <div style={{ font: "500 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', marginTop: 12 }}>{error}</div>}
      <div className="btn btn-accent" style={{ marginTop: 16, textAlign: 'center', padding: 16, opacity: busy ? 0.6 : 1 }} onClick={submit}>
        {t('login.submit')}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
        <Link to="/signup" style={{ font: "600 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)' }}>{t('login.signupLink')}</Link>
      </div>
      <div style={{ marginTop: 26, font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim-2)' }}>
        {t('login.testHint')}
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 6, justifyContent: 'center', font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim-2)' }}>
        <Link to="/terms" style={{ color: 'var(--text-dim-2)', textDecoration: 'underline' }}>{t('common.terms')}</Link>
        <span>·</span>
        <Link to="/privacy" style={{ color: 'var(--text-dim-2)', textDecoration: 'underline' }}>{t('common.privacy')}</Link>
      </div>

      <Drawer open={forgotOpen} onClose={() => setForgotOpen(false)}>
        <div style={{ font: "600 18px 'Noto Sans Hebrew',sans-serif", marginBottom: 6 }}>{t('login.forgotTitle')}</div>
        {forgotMsg ? (
          <>
            <div style={{ font: "400 13px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 10 }}>{forgotMsg}</div>
            <div className="btn btn-outline" style={{ marginTop: 16, textAlign: 'center', padding: 16 }} onClick={() => setForgotOpen(false)}>{t('login.forgotBack')}</div>
          </>
        ) : (
          <>
            <div style={{ font: "400 13px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 4 }}>
              {t('login.forgotDesc')}
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="section-label" style={{ paddingBottom: 9 }}>{t('login.email')}</div>
              <input className="field" style={{ direction: 'ltr', textAlign: 'left' }} placeholder="you@example.com"
                value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitForgot()} />
            </div>
            {forgotError && <div style={{ font: "400 12.5px/1.5 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', marginTop: 10 }}>{forgotError}</div>}
            <div className="btn btn-accent" style={{ marginTop: 16, textAlign: 'center', padding: 16, opacity: forgotBusy ? 0.6 : 1 }} onClick={submitForgot}>
              {t('login.forgotSubmit')}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
