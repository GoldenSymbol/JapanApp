import { useNavigate } from 'react-router-dom';
import { Drawer } from './Drawer';
import { useNotifications } from '../state/NotificationsContext';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso + 'Z').getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  return `לפני ${Math.floor(hours / 24)} ימים`;
}

const SCREEN_PATH: Record<string, string> = {
  trip: '/trip', city: '/trip', today: '/today', budget: '/budget', map: '/map',
};

export function NotificationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notifications, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <Drawer open={open} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ font: "600 20px/1.25 'Noto Sans Hebrew',sans-serif" }}>התראות</div>
        <div onClick={markAllRead} style={{ font: "600 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer' }}>
          סמן הכל כנקרא
        </div>
      </div>
      {notifications.length === 0 && (
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>אין עדיין התראות</div>
      )}
      <div style={{ marginTop: 8 }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={async () => {
              await markRead(n.id);
              if (n.targetScreen && SCREEN_PATH[n.targetScreen]) navigate(SCREEN_PATH[n.targetScreen]);
              onClose();
            }}
            style={{ display: 'flex', gap: 10, padding: '14px 0', borderTop: '1px solid var(--border-soft)', cursor: 'pointer' }}
          >
            <div style={{ width: 8, paddingTop: 6, flex: 'none' }}>
              {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "500 14px/1.35 'Noto Sans Hebrew',sans-serif" }}>{n.title}</div>
              <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
