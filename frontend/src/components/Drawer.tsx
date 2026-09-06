import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function Drawer({ open, onClose, children, position = 'bottom' }: {
  open: boolean; onClose: () => void; children: ReactNode; position?: 'bottom' | 'top';
}) {
  const top = position === 'top';
  const handle = <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--border)', margin: top ? '0 auto 14px' : '14px auto 6px' }} />;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`drawer-overlay${top ? ' drawer-overlay-top' : ''}`}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className={`drawer-sheet${top ? ' drawer-sheet-top' : ''}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: top ? '-100%' : '100%' }}
            animate={{ y: 0 }}
            exit={{ y: top ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            {!top && handle}
            <div style={{ overflow: 'auto', padding: '10px 22px 32px' }}>{children}</div>
            {top && handle}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
