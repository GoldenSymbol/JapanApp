import { JaPlanLoader } from './JaPlanLoader';

// Full-screen cover with the app's loader, for waits where the screen underneath shouldn't be usable.
export function LoaderOverlay({ label }: { label: string }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <JaPlanLoader size={200} label={label} />
    </div>
  );
}
