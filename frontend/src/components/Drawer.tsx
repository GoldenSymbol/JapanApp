import type { ReactNode } from 'react';

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--border)', margin: '14px auto 6px' }} />
        <div style={{ overflow: 'auto', padding: '10px 22px 32px' }}>{children}</div>
      </div>
    </div>
  );
}
