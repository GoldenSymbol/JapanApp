import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { ApiError } from '../api';

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!agreedToTerms) { setError('צריך לאשר את תנאי השימוש כדי להמשיך'); return; }
    setError(''); setBusy(true);
    try {
      await signup(name, email, password);
      navigate('/choose');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'שגיאה ביצירת חשבון');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center', padding: '0 26px 40px' }}>
      <Link to="/login" style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', padding: '8px 0' }}>→ חזרה</Link>
      <div style={{ font: "600 27px/1.25 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.4px', marginTop: 20 }}>יצירת חשבון</div>
      <div style={{ marginTop: 26 }}>
        <div className="section-label" style={{ paddingBottom: 9 }}>שם</div>
        <input className="field" placeholder="איך לקרוא לך" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ marginTop: 14 }}>
        <div className="section-label" style={{ paddingBottom: 9 }}>אימייל</div>
        <input className="field" style={{ direction: 'ltr', textAlign: 'left' }} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div style={{ marginTop: 14 }}>
        <div className="section-label" style={{ paddingBottom: 9 }}>סיסמה</div>
        <input className="field" style={{ direction: 'ltr', textAlign: 'left' }} type="password" placeholder="לפחות 8 תווים" value={password}
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
          קראתי ואני מאשר/ת את <Link to="/terms" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--accent)', fontWeight: 600 }}>תנאי השימוש</Link>
        </div>
      </div>
      <div style={{ font: "400 11.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 8 }}>
        פרטי ההרשמה שלכם (שם, אימייל) ותוכן הטיול שתוסיפו יישמרו וישותפו עם שאר משתתפי הטיול שתצטרפו אליו — פירוט מלא ב
        <Link to="/privacy" style={{ color: 'var(--accent)', fontWeight: 600 }}>מדיניות הפרטיות</Link>.
      </div>

      {error && <div style={{ font: "500 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', marginTop: 12 }}>{error}</div>}
      <div className="btn btn-accent" style={{ marginTop: 16, textAlign: 'center', padding: 16, opacity: busy ? 0.6 : 1 }} onClick={submit}>
        צור חשבון והיכנס
      </div>
    </div>
  );
}
