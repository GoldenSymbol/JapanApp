import type { ReactNode } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';

// Dismiss if dragged past this many px, or flicked fast enough, in the closing direction.
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 500;

export function Drawer({ open, onClose, children, position = 'bottom' }: {
  open: boolean; onClose: () => void; children: ReactNode; position?: 'bottom' | 'top';
}) {
  const top = position === 'top';
  const dragControls = useDragControls();
  // Only the handle bar starts a drag — the content area stays free for scrolling lists
  // and its own gestures (e.g. swipe-to-delete on a notification row) without interference.
  const handle = (
    <div
      onPointerDown={(e) => dragControls.start(e)}
      style={{ padding: '10px 0', margin: top ? '0 0 4px' : '4px 0 0', touchAction: 'none', cursor: 'grab' }}
    >
      <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--border)', margin: '0 auto' }} />
    </div>
  );
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
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={top ? { top: 1, bottom: 0 } : { top: 0, bottom: 1 }}
            onDragEnd={(_e, info) => {
              const closing = top ? info.offset.y < 0 : info.offset.y > 0;
              const pastDistance = Math.abs(info.offset.y) > DISMISS_DISTANCE;
              const pastVelocity = top ? info.velocity.y < -DISMISS_VELOCITY : info.velocity.y > DISMISS_VELOCITY;
              if (closing && (pastDistance || pastVelocity)) onClose();
            }}
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
