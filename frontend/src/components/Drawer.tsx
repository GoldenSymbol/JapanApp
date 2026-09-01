import type { ReactNode } from 'react';

export function Drawer({ open, onClose, children, position = 'bottom' }: {
  open: boolean; onClose: () => void; children: ReactNode; position?: 'bottom' | 'top';
}) {
  if (!open) return null;
  const top = position === 'top';
  const handle = <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--border)', margin: top ? '0 auto 14px' : '14px auto 6px' }} />;
  return (
    <div className={`drawer-overlay${top ? ' drawer-overlay-top' : ''}`} onClick={onClose}>
      <div className={`drawer-sheet${top ? ' drawer-sheet-top' : ''}`} onClick={(e) => e.stopPropagation()}>
        {!top && handle}
        <div style={{ overflow: 'auto', padding: '10px 22px 32px' }}>{children}</div>
        {top && handle}
      </div>
    </div>
  );
}
