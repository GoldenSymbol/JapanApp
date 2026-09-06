import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const TABS = [
  { path: '/trip', label: 'מסלול' },
  { path: '/map', label: 'מפה' },
  { path: '/today', label: 'היום' },
  { path: '/budget', label: 'תקציב' },
];

export function BottomNav() {
  return (
    <div style={{
      position: 'sticky', bottom: 0, left: 0, right: 0, padding: '14px 14px 26px',
      background: 'color-mix(in srgb, var(--bg) 82%, transparent)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-around', zIndex: 20,
    }}>
      {TABS.map((t) => (
        <NavLink key={t.path} to={t.path} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '5px 12px', cursor: 'pointer' }}>
              <div style={{ font: "600 15px 'Noto Sans Hebrew',sans-serif", color: isActive ? 'var(--text)' : 'var(--text-dim-2)' }}>{t.label}</div>
              <div style={{ width: 20, height: 2.5, position: 'relative' }}>
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    style={{ position: 'absolute', inset: 0, borderRadius: 2, background: 'var(--accent)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </div>
            </div>
          )}
        </NavLink>
      ))}
    </div>
  );
}
