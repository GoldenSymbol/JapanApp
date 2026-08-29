import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';

export function Members() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  async function load() { setTrip((await api('/trips/current')).trip); }
  useEffect(() => { load(); }, []);

  async function copyCode() {
    try { await navigator.clipboard.writeText(trip.code); } catch { /* clipboard may be unavailable */ }
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }
  async function shareCode() {
    const text = `הצטרף לטיול שלנו ליפן 2027! קוד הזמנה: ${trip.code}`;
    if (navigator.share) { try { await navigator.share({ text }); } catch { /* cancelled */ } }
    else { try { await navigator.clipboard.writeText(text); } catch { /* ignore */ } }
    setShared(true); setTimeout(() => setShared(false), 1600);
  }
  async function rotateCode() { await api('/trips/rotate-code', { method: 'POST' }); await load(); }
  async function removeMember(id: string) { await api(`/trips/members/${id}`, { method: 'DELETE' }); await load(); }
  async function sendInvite() {
    if (!inviteEmail.includes('@')) return;
    await api('/trips/invite', { method: 'POST', json: { email: inviteEmail } });
    setInviteEmail('');
    await load();
  }

  if (!trip || !user) return null;

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 0 24px' }}>
      <div style={{ padding: '6px 22px 0' }}>
        <div onClick={() => navigate('/trip')} style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer', padding: '8px 0' }}>→ חזרה למסלול</div>
      </div>
      <div style={{ padding: '6px 22px 20px' }}>
        <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', letterSpacing: '.7px' }}>מחובר כ־{user.email}</div>
        <div style={{ font: "600 29px/1.15 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.5px', marginTop: 9 }}>הטיול והחברים</div>
        <div style={{ font: "400 12.5px/1.4 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7 }}>יפן 2027 · {trip.members.length} משתתפים</div>
      </div>

      <div className="card" style={{ margin: '0 22px', background: 'var(--card)' }}>
        <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', letterSpacing: '.6px' }}>קוד הזמנה לטיול</div>
        <div style={{ font: "600 27px ui-monospace,Menlo,monospace", letterSpacing: 3, marginTop: 10, direction: 'ltr' }}>{trip.code}</div>
        <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
          <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={copyCode}>{copied ? '✓ הועתק' : 'העתק קוד'}</div>
          <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center' }} onClick={shareCode}>{shared ? '✓ נשלח' : 'שתף קישור'}</div>
        </div>
        <div onClick={rotateCode} style={{ marginTop: 10, textAlign: 'center', font: "500 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', cursor: 'pointer', padding: 6 }}>
          צור קוד חדש (מבטל את הקודם)
        </div>
      </div>

      <div className="section-label" style={{ padding: '26px 22px 6px' }}>משתתפים</div>
      <div style={{ padding: '0 22px' }}>
        {trip.members.map((m: any) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 0', borderTop: '1px solid var(--border-soft)' }}>
            <div style={{ width: 38, height: 38, flex: 'none', borderRadius: '50%', background: m.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', font: "600 15px 'Noto Sans Hebrew',sans-serif", color: '#14161A' }}>
              {m.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ font: "600 15.5px 'Noto Sans Hebrew',sans-serif" }}>{m.name}</div>
                <div className="pill" style={{ fontSize: 10.5, border: '1px solid var(--border)' }}>{m.role === 'owner' ? 'יצר את הטיול' : 'משתתף/ת'}</div>
              </div>
              <div style={{ font: "400 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 4, direction: 'ltr', textAlign: 'right' }}>{m.email}</div>
            </div>
            {m.id === user.id ? (
              <div className="pill" style={{ flex: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>אתה</div>
            ) : (
              <div className="pill" style={{ flex: 'none', cursor: 'pointer', border: '1px solid rgba(217,86,75,.45)', color: 'var(--danger)' }} onClick={() => removeMember(m.id)}>הסר</div>
            )}
          </div>
        ))}
      </div>

      {trip.pendingInvites?.length > 0 && trip.pendingInvites.map((inv: any) => (
        <div key={inv.email} style={{ margin: '24px 22px 0', border: '1px dashed var(--border)', borderRadius: 16, padding: 15 }}>
          <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', letterSpacing: '.5px' }}>הזמנה שנשלחה</div>
          <div style={{ font: "600 14.5px 'Noto Sans Hebrew',sans-serif", marginTop: 6, direction: 'ltr', textAlign: 'right' }}>{inv.email}</div>
          <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 5 }}>ממתין להצטרפות</div>
        </div>
      ))}

      <div style={{ padding: '26px 22px 0' }}>
        <div className="section-label" style={{ paddingBottom: 10 }}>הזמנה באימייל</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="field" style={{ flex: 1, direction: 'ltr', textAlign: 'left' }} placeholder="name@example.com"
            value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendInvite()} />
          <div className="btn btn-accent" onClick={sendInvite}>הזמן</div>
        </div>
        <div style={{ font: "400 11.5px/1.55 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 10 }}>
          הקוד משותף לכל המשתתפים. קישור באימייל הוא אישי וחד-פעמי.
        </div>
      </div>
      <div style={{ padding: '26px 22px 0' }}>
        <div className="btn" style={{ border: '1px solid rgba(217,86,75,.4)', color: 'var(--danger)', textAlign: 'center', padding: 15 }} onClick={() => { logout(); navigate('/login'); }}>יציאה מהחשבון</div>
      </div>
    </div>
  );
}
