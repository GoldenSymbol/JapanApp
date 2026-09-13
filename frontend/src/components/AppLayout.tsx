import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { Toast } from './Toast';

export function AppLayout() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <TopBar />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 19,
        height: 'calc(130px + env(safe-area-inset-bottom))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        maskImage: 'linear-gradient(to top, black 35%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, black 35%, transparent 100%)',
        background: 'linear-gradient(to top, color-mix(in srgb, var(--bg) 55%, transparent), transparent)',
        pointerEvents: 'none',
      }} />
      <BottomNav />
      <Toast />
    </div>
  );
}
