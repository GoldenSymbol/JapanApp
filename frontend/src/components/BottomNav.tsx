import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TripIcon, MapPinIcon, CalendarIcon, CardIcon } from './Icons';

const TABS = [
  { path: '/trip', label: 'מסלול', Icon: TripIcon },
  { path: '/map', label: 'מפה', Icon: MapPinIcon },
  { path: '/today', label: 'היום', Icon: CalendarIcon },
  { path: '/budget', label: 'תקציב', Icon: CardIcon },
];

export function BottomNav() {
  return (
    <div style={{
      position: 'fixed', left: 16, right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom))',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: 4,
      padding: 6, borderRadius: 999, zIndex: 20,
      background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      border: '1px solid var(--border-soft)', boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
    }}>
      {TABS.map(({ path, Icon }) => (
        <NavLink key={path} to={path} style={{ textDecoration: 'none', flex: 1 }}>
          {({ isActive }) => (
            <div style={{
              position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center',
              padding: '11px 0', color: isActive ? 'var(--text)' : 'var(--text-dim-2)',
            }}>
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  style={{ position: 'absolute', inset: '2px 8px', borderRadius: 999, background: 'var(--card-soft)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span style={{ position: 'relative', display: 'flex' }}><Icon /></span>
            </div>
          )}
        </NavLink>
      ))}
    </div>
  );
}
