import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from './Drawer';
import { useNotifications, notificationTitle, type Notification } from '../state/NotificationsContext';
import { useLanguage } from '../state/LanguageContext';

function timeAgo(iso: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const diffMs = Date.now() - new Date(/[Z+]|-\d\d:\d\d$/.test(iso) ? iso : iso + 'Z').getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('notifications.justNow');
  if (mins < 60) return t('notifications.minutesAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('notifications.hoursAgo', { n: hours });
  return t('notifications.daysAgo', { n: Math.floor(hours / 24) });
}

const SCREEN_PATH: Record<string, string> = {
  trip: '/trip', city: '/trip', today: '/today', budget: '/budget', map: '/map',
};

const DELETE_WIDTH = 72;

function SwipeableNotification({ n, onOpen, onDelete }: {
  n: Notification; onOpen: () => void; onDelete: () => void;
}) {
  const { t, lang } = useLanguage();
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
        {t('notifications.delete')}
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
          <div style={{ font: "500 14px/1.35 'Noto Sans Hebrew',sans-serif" }}>{notificationTitle(n, lang, t)}</div>
          <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 4 }}>{timeAgo(n.createdAt, t)}</div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notifications, markRead, markAllRead, deleteNotification, deleteAll } = useNotifications();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <Drawer open={open} onClose={onClose} position="top">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ font: "600 20px/1.25 'Noto Sans Hebrew',sans-serif" }}>{t('notifications.title')}</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div onClick={markAllRead} style={{ font: "600 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer' }}>
            {t('notifications.markAllRead')}
          </div>
          {notifications.length > 0 && (
            <div onClick={deleteAll} style={{ font: "600 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', cursor: 'pointer' }}>
              {t('notifications.deleteAll')}
            </div>
          )}
        </div>
      </div>
      {notifications.length === 0 && (
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>{t('notifications.empty')}</div>
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
