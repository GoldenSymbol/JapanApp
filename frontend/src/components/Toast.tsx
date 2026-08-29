import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../state/NotificationsContext';

const SCREEN_PATH: Record<string, string> = {
  trip: '/trip', city: '/trip', today: '/today', budget: '/budget', map: '/map',
};

export function Toast() {
  const { toast, dismissToast, markRead } = useNotifications();
  const navigate = useNavigate();
  if (!toast) return null;
  return (
    <div className="toast">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "600 13.5px 'Noto Sans Hebrew',sans-serif" }}>{toast.title}</div>
          {toast.actorName && <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 4 }}>{toast.actorName}</div>}
          <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
            {toast.targetScreen && SCREEN_PATH[toast.targetScreen] && (
              <div onClick={async () => { await markRead(toast.id); navigate(SCREEN_PATH[toast.targetScreen!]); dismissToast(); }}
                style={{ font: "600 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer' }}>
                הצג במסלול
              </div>
            )}
          </div>
        </div>
        <div onClick={dismissToast} style={{ cursor: 'pointer', color: 'var(--text-dim)', flex: 'none' }}>✕</div>
      </div>
    </div>
  );
}
