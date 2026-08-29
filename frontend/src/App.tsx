import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './state/AuthContext';
import { NotificationsProvider } from './state/NotificationsContext';
import { TripDataProvider } from './state/TripDataContext';
import { AppLayout } from './components/AppLayout';

import { Login } from './screens/Login';
import { Signup } from './screens/Signup';
import { Choose } from './screens/Choose';
import { JoinTrip } from './screens/JoinTrip';
import { Trip } from './screens/Trip';
import { City } from './screens/City';
import { MapScreen } from './screens/MapScreen';
import { Today } from './screens/Today';
import { Budget } from './screens/Budget';
import { Chat } from './screens/Chat';
import { Settings } from './screens/Settings';
import { Members } from './screens/Members';

function Splash() {
  return (
    <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ font: "400 46px/1 'Zen Old Mincho',serif", color: 'var(--accent)' }}>日本</div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireTrip({ children }: { children: React.ReactNode }) {
  const { trip } = useAuth();
  if (!trip) return <Navigate to="/choose" replace />;
  return <>{children}</>;
}

function AuthedApp() {
  return (
    <RequireTrip>
      <NotificationsProvider>
        <TripDataProvider>
          <AppLayout />
        </TripDataProvider>
      </NotificationsProvider>
    </RequireTrip>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/choose" element={<RequireAuth><Choose /></RequireAuth>} />
      <Route path="/join" element={<RequireAuth><JoinTrip /></RequireAuth>} />

      <Route element={<RequireAuth><AuthedApp /></RequireAuth>}>
        <Route path="/trip" element={<Trip />} />
        <Route path="/city/:id" element={<City />} />
        <Route path="/map" element={<MapScreen />} />
        <Route path="/today" element={<Today />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/members" element={<Members />} />
      </Route>

      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  );
}
