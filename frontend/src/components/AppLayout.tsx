import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { Toast } from './Toast';

export function AppLayout() {
  return (
    <div className="app-shell">
      <TopBar />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
      <BottomNav />
      <Toast />
    </div>
  );
}
