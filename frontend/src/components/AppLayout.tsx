import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { Toast } from './Toast';
import { OfflineBanner } from './OfflineBanner';
import { OnboardingTour } from './OnboardingTour';
import { useAuth } from '../state/AuthContext';

// Settings fires this to replay the first-use tour.
export const OPEN_TOUR_EVENT = 'michiplan:open-tour';

export function AppLayout() {
  const location = useLocation();
  const { user, updateMe } = useAuth();
  const [replay, setReplay] = useState(false);
  // Hides the first-use tour right away on close, without waiting for the profile save to come back.
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const open = () => setReplay(true);
    window.addEventListener(OPEN_TOUR_EVENT, open);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, open);
  }, []);
  const tourOpen = replay || (!!user && !user.tourSeen && !dismissed);
  function closeTour() {
    setReplay(false);
    setDismissed(true);
    if (user && !user.tourSeen) updateMe({ tourSeen: true }).catch(() => {});
  }
  return (
    <div className="app-shell">
      <TopBar />
      <OfflineBanner />
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
      <OnboardingTour open={tourOpen} onClose={closeTour} />
    </div>
  );
}
