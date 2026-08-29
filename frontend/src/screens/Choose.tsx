import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export function Choose() {
  const { user, createTrip } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setBusy(true);
    try {
      await createTrip();
      navigate('/trip');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center', padding: '0 26px 40px' }}>
      <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', letterSpacing: '.7px' }}>שלום {user?.name}</div>
      <div style={{ font: "600 27px/1.25 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.4px', marginTop: 9 }}>איך נתחיל?</div>
      <div style={{ font: "400 13.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 9 }}>
        אפשר לפתוח טיול חדש מאפס, או להצטרף לטיול שמישהו כבר תכנן.
      </div>

      <div onClick={handleCreate} className="card" style={{ marginTop: 26, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        <div className="jp-watermark" style={{ left: 14, top: 2, fontSize: 58 }}>新</div>
        <div style={{ position: 'relative' }}>
          <div style={{ font: "600 18px 'Noto Sans Hebrew',sans-serif" }}>פתיחת טיול חדש</div>
          <div style={{ font: "400 12.5px/1.55 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7, maxWidth: '80%' }}>
            מסלול ריק, תאריכים וערים שאתה מוסיף. תקבל קוד הזמנה לשתף עם מי שנוסע איתך.
          </div>
          <div className="pill" style={{ marginTop: 14, background: 'var(--accent)', color: '#fff', padding: '9px 16px' }}>צור טיול</div>
        </div>
      </div>

      <div onClick={() => navigate('/join')} className="card" style={{ marginTop: 12, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent' }}>
        <div className="jp-watermark" style={{ left: 14, top: 2, fontSize: 58 }}>共</div>
        <div style={{ position: 'relative' }}>
          <div style={{ font: "600 18px 'Noto Sans Hebrew',sans-serif" }}>הצטרפות לטיול קיים</div>
          <div style={{ font: "400 12.5px/1.55 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7, maxWidth: '80%' }}>
            יש לך קוד הזמנה? תראה בדיוק את אותו מסלול, אותם תאריכים ואותו תקציב.
          </div>
          <div className="pill" style={{ marginTop: 14, border: '1px solid var(--border)', padding: '9px 16px' }}>הזן קוד</div>
        </div>
      </div>
    </div>
  );
}
