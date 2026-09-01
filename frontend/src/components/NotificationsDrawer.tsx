import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from './Drawer';
import { useNotifications, type Notification } from '../state/NotificationsContext';

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

const DELETE_WIDTH = 72;

function SwipeableNotification({ n, onOpen, onDelete }: {
  n: Notification; onOpen: () => void; onDelete: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startDragX = useRef(0);
  const moved = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    startDragX.current = dragX;
    moved.current = false;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 4) moved.current = true;
    setDragX(Math.min(DELETE_WIDTH, Math.max(0, startDragX.current + dx)));
  }
  function endDrag() {
    setDragging(false);
    setDragX((x) => (x > DELETE_WIDTH / 2 ? DELETE_WIDTH : 0));
  }
  function handleClick() {
    if (moved.current) return;
    if (dragX > 0) { setDragX(0); return; }
    onOpen();
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid var(--border-soft)' }}>
      <div
        onClick={onDelete}
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: DELETE_WIDTH,
          background: 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          font: "600 12.5px 'Noto Sans Hebrew',sans-serif", cursor: 'pointer',
        }}
      >
        מחק
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handleClick}
        style={{
          position: 'relative', display: 'flex', gap: 10, padding: '14px 0', cursor: 'pointer',
          background: 'var(--card)', touchAction: 'pan-y',
          transform: `translateX(${dragX}px)`, transition: dragging ? 'none' : 'transform .2s ease',
        }}
      >
        <div style={{ width: 8, paddingTop: 6, flex: 'none' }}>
          {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "500 14px/1.35 'Noto Sans Hebrew',sans-serif" }}>{n.title}</div>
          <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notifications, markRead, markAllRead, deleteNotification, deleteAll } = useNotifications();
  const navigate = useNavigate();

  return (
    <Drawer open={open} onClose={onClose} position="top">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ font: "600 20px/1.25 'Noto Sans Hebrew',sans-serif" }}>התראות</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div onClick={markAllRead} style={{ font: "600 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer' }}>
            סמן הכל כנקרא
          </div>
          {notifications.length > 0 && (
            <div onClick={deleteAll} style={{ font: "600 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', cursor: 'pointer' }}>
              מחק הכל
            </div>
          )}
        </div>
      </div>
      {notifications.length === 0 && (
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>אין עדיין התראות</div>
      )}
      <div style={{ marginTop: 8 }}>
        {notifications.map((n) => (
          <SwipeableNotification
            key={n.id}
            n={n}
            onOpen={async () => {
              await markRead(n.id);
              if (n.targetScreen && SCREEN_PATH[n.targetScreen]) navigate(SCREEN_PATH[n.targetScreen]);
              onClose();
            }}
            onDelete={() => deleteNotification(n.id)}
          />
        ))}
      </div>
    </Drawer>
  );
}
