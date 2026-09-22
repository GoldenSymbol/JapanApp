import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { ApiError } from '../api';
import { Drawer } from '../components/Drawer';
import logo from '../assets/logo.png';

export function Login() {
  const { login, resetPassword } = useAuth();
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

  async function submit() {
    if (!email.trim() || !password) { setError('נא למלא את השדות החסרים'); return; }
    setError(''); setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/today');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'שגיאה בהתחברות');
    } finally {
      setBusy(false);
    }
  }

  function openForgot() {
    setForgotEmail(email);
    setForgotMsg('');
    setForgotOpen(true);
  }

  async function submitForgot() {
    if (!forgotEmail.trim()) { setForgotMsg('נא להזין כתובת אימייל'); return; }
    setForgotBusy(true);
    try {
      await resetPassword(forgotEmail.trim());
    } catch {
      // Deliberately shown even on failure (e.g. no account with that email) — a different
      // message here would let anyone probe which emails have accounts (user enumeration).
    } finally {
      setForgotBusy(false);
      setForgotMsg('אם קיים חשבון עם האימייל הזה, נשלח אליו קישור לאיפוס סיסמה');
    }
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center', padding: '0 26px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img src={logo} alt="Japan 2027" style={{ width: 300, height: 'auto' }} />
      </div>

      <div style={{ marginTop: 30 }}>
        <div className="section-label" style={{ paddingBottom: 9 }}>אימייל</div>
        <input className="field" style={{ direction: 'ltr', textAlign: 'left' }} placeholder="you@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9 }}>
          <div className="section-label">סיסמה</div>
          <div onClick={() => setShowPw((v) => !v)} style={{ font: "500 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', cursor: 'pointer' }}>
            {showPw ? 'הסתר' : 'הצג'}
          </div>
        </div>
        <input className="field" style={{ direction: 'ltr', textAlign: 'left' }} type={showPw ? 'text' : 'password'} placeholder="••••••••"
          value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <div onClick={openForgot} style={{ font: "500 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer', marginTop: 9 }}>
          שכחתי סיסמה
        </div>
      </div>
      {error && <div style={{ font: "500 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', marginTop: 12 }}>{error}</div>}
      <div className="btn btn-accent" style={{ marginTop: 16, textAlign: 'center', padding: 16, opacity: busy ? 0.6 : 1 }} onClick={submit}>
        התחברות
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
        <Link to="/signup" style={{ font: "600 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)' }}>יצירת חשבון חדש</Link>
      </div>
      <div style={{ marginTop: 26, font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim-2)' }}>
        לבדיקה: uri@example.com / partner@example.com, סיסמה japan2027
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 6, justifyContent: 'center', font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim-2)' }}>
        <Link to="/terms" style={{ color: 'var(--text-dim-2)', textDecoration: 'underline' }}>תנאי שימוש</Link>
        <span>·</span>
        <Link to="/privacy" style={{ color: 'var(--text-dim-2)', textDecoration: 'underline' }}>מדיניות פרטיות</Link>
      </div>

      <Drawer open={forgotOpen} onClose={() => setForgotOpen(false)}>
        <div style={{ font: "600 18px 'Noto Sans Hebrew',sans-serif", marginBottom: 6 }}>איפוס סיסמה</div>
        {forgotMsg ? (
          <div style={{ font: "400 13px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 10 }}>{forgotMsg}</div>
        ) : (
          <>
            <div style={{ font: "400 13px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 4 }}>
              נזין את כתובת האימייל שלך ונשלח קישור לאיפוס הסיסמה.
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="section-label" style={{ paddingBottom: 9 }}>אימייל</div>
              <input className="field" style={{ direction: 'ltr', textAlign: 'left' }} placeholder="you@example.com"
                value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitForgot()} />
            </div>
            <div className="btn btn-accent" style={{ marginTop: 16, textAlign: 'center', padding: 16, opacity: forgotBusy ? 0.6 : 1 }} onClick={submitForgot}>
              שלח קישור לאיפוס
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
