import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './state/AuthContext';
import { useLanguage } from './state/LanguageContext';
import { NotificationsProvider } from './state/NotificationsContext';
import { TripDataProvider } from './state/TripDataContext';
import { AppLayout } from './components/AppLayout';
import { JaPlanLoader } from './components/JaPlanLoader';
import { TermsGate } from './components/TermsGate';

import { Login } from './screens/Login';
import { Signup } from './screens/Signup';
import { Choose } from './screens/Choose';
import { JoinTrip } from './screens/JoinTrip';
import { Trip } from './screens/Trip';
import { City } from './screens/City';
import { MapScreen } from './screens/MapScreen';
import { Today } from './screens/Today';
import { Budget } from './screens/Budget';
import { Settings } from './screens/Settings';
import { Members } from './screens/Members';
import { Terms } from './screens/Terms';
import { Privacy } from './screens/Privacy';
import { Documents } from './screens/Documents';

function Splash() {
  const { lang } = useLanguage();
  return (
    <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <JaPlanLoader size={200} label={lang === 'en' ? 'Loading JaPlan…' : 'טוען את JaPlan…'} />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, currentTermsVersion } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  // Applies to every protected route (not just the ones inside AuthedApp) so an existing user
  // hits the one-time acceptance gate the first time they land anywhere post-login, not just
  // once they reach a trip. currentTermsVersion is null only for the brief moment before the
  // first /auth/me response comes back, during which `loading` above already covers us.
  if (currentTermsVersion && user.termsAcceptedVersion !== currentTermsVersion) return <TermsGate />;
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
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/choose" element={<RequireAuth><Choose /></RequireAuth>} />
      <Route path="/join" element={<RequireAuth><JoinTrip /></RequireAuth>} />

      <Route element={<RequireAuth><AuthedApp /></RequireAuth>}>
        <Route path="/trip" element={<Trip />} />
        <Route path="/city/:id" element={<City />} />
        <Route path="/map" element={<MapScreen />} />
        <Route path="/today" element={<Today />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/members" element={<Members />} />
      </Route>

      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  );
}
