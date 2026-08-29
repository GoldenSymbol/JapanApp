import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../state/AuthContext';

export function JoinTrip() {
  const { joinTrip } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = code.trim();
    if (c.length < 4) { setPreview(null); return; }
    const t = setTimeout(async () => {
      try {
        const data = await api(`/trips/preview?code=${encodeURIComponent(c)}`);
        setPreview(data);
        setError('');
      } catch {
        setPreview(null);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [code]);

  async function submit() {
    setBusy(true); setError('');
    try {
      await joinTrip(code.trim());
      navigate('/trip');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'שגיאה בהצטרפות');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center', padding: '0 26px 40px' }}>
      <div onClick={() => navigate('/choose')} style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer', padding: '8px 0' }}>→ חזרה</div>
      <div style={{ font: "600 27px/1.25 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.4px', marginTop: 20 }}>הצטרפות לטיול קיים</div>
      <div style={{ font: "400 13.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 10 }}>
        הזן את קוד ההזמנה שקיבלת. אחרי ההצטרפות תראה בדיוק את אותו מסלול, אותם תאריכים ואותו תקציב.
      </div>
      <div style={{ marginTop: 26 }}>
        <div className="section-label" style={{ paddingBottom: 9 }}>קוד הזמנה</div>
        <input className="field" style={{ font: "600 18px ui-monospace,Menlo,monospace", direction: 'ltr', textAlign: 'center', letterSpacing: 2 }}
          placeholder="JPN-4K2Q" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      </div>
      {preview && (
        <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
          <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', letterSpacing: '.5px' }}>נמצא טיול</div>
          <div style={{ font: "600 17px 'Noto Sans Hebrew',sans-serif", marginTop: 7 }}>{preview.name}</div>
          <div style={{ font: "400 12.5px/1.5 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 5 }}>
            {preview.destinations} יעדים · {preview.members} משתתפים · נוצר על ידי {preview.ownerName}
          </div>
        </div>
      )}
      {error && <div style={{ font: "500 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', marginTop: 12 }}>{error}</div>}
      <div className="btn btn-accent" style={{ marginTop: 14, textAlign: 'center', padding: 16, opacity: busy || !preview ? 0.6 : 1 }} onClick={preview ? submit : undefined}>
        הצטרף ופתח את המסלול
      </div>
    </div>
  );
}
