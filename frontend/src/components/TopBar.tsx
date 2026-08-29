import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, PeopleIcon, GearIcon, TranslateIcon } from './Icons';
import { NotificationsDrawer } from './NotificationsDrawer';
import { TranslateDrawer } from './TranslateDrawer';
import { useNotifications } from '../state/NotificationsContext';

export function TopBar() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [trOpen, setTrOpen] = useState(false);

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, padding: '10px 22px 8px' }}>
      <div className="icon-btn" title="הגדרות" onClick={() => navigate('/settings')}><GearIcon /></div>
      <div className="icon-btn" title="חברים" onClick={() => navigate('/members')}><PeopleIcon /></div>
      <div className="icon-btn" title="תרגום" onClick={() => setTrOpen(true)}><TranslateIcon /></div>
      <div className="icon-btn" title="התראות" onClick={() => setNotifOpen(true)}>
        <BellIcon />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: -3, insetInlineStart: -3, minWidth: 17, height: 17, borderRadius: 999,
            background: 'var(--danger)', color: '#fff', font: "600 10px/17px 'Noto Sans Hebrew',sans-serif",
            textAlign: 'center', padding: '0 4px',
          }}>{unreadCount}</div>
        )}
      </div>
      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
      <TranslateDrawer open={trOpen} onClose={() => setTrOpen(false)} />
    </div>
  );
}
