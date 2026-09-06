import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { ApiError } from '../api';
import logo from '../assets/logo.png';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(''); setBusy(true);
    try {
      await login(email, password);
      navigate('/today');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'שגיאה בהתחברות');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center', padding: '0 26px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img src={logo} alt="Japan 2027" style={{ width: 220, height: 'auto' }} />
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
    </div>
  );
}
