import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import { api, ApiError } from '../api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  photoUrl: string | null;
  darkMode: boolean;
  palette: string;
  uiLang: string;
  baseCurrency: string;
  prefs: { weather: boolean; offlineSave: boolean; autoSync: boolean };
  notifPrefs: { newAttraction: boolean; newDestination: boolean; reschedule: boolean; newExpense: boolean };
  termsAcceptedVersion: string | null;
  termsAcceptedAt: string | null;
}
export interface TripSummary { id: string; name: string; }

interface AuthState {
  user: User | null;
  trip: TripSummary | null;
  loading: boolean;
  // The Terms version currently in force, per the server (backend/src/legal.ts). A signed-in
  // user whose termsAcceptedVersion doesn't match this needs to see the terms gate — see
  // RequireAuth in App.tsx. Null until the first authenticated response comes back.
  currentTermsVersion: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  createTrip: () => Promise<void>;
  joinTrip: (code: string) => Promise<void>;
  refresh: () => Promise<void>;
  updateMe: (patch: Record<string, any>) => Promise<void>;
  acceptTerms: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'האימייל הזה כבר רשום',
  'auth/weak-password': 'הסיסמה חייבת להיות לפחות 6 תווים',
  'auth/invalid-email': 'כתובת אימייל לא תקינה',
  'auth/user-not-found': 'אימייל או סיסמה שגויים',
  'auth/wrong-password': 'אימייל או סיסמה שגויים',
  'auth/invalid-credential': 'אימייל או סיסמה שגויים',
  'auth/too-many-requests': 'יותר מדי ניסיונות, נסה שוב בעוד כמה דקות',
};

function toApiError(e: any): ApiError {
  return new ApiError(400, { message: AUTH_ERROR_MESSAGES[e?.code] || 'שגיאה, נסה שוב' });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [trip, setTrip] = useState<TripSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTermsVersion, setCurrentTermsVersion] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const data = await api('/auth/me');
    setUser(data.user); setTrip(data.trip); setCurrentTermsVersion(data.currentTermsVersion);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { setUser(null); setTrip(null); setLoading(false); return; }
      try {
        await loadProfile();
      } catch {
        setUser(null); setTrip(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      throw toApiError(e);
    }
    await loadProfile();
  }, [loadProfile]);

  // Called only after Signup.tsx has confirmed the terms checkbox was checked — this always
  // records acceptance of the current terms right after creating the profile, in the same flow,
  // rather than leaving a freshly-created account to hit the terms gate on its very first screen.
  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (password.length < 8) throw new ApiError(400, { message: 'הסיסמה צריכה להיות לפחות 8 תווים' });
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
    } catch (e: any) {
      throw toApiError(e);
    }
    await api('/auth/bootstrap', { method: 'POST', json: { name, email } });
    const data = await api('/auth/accept-terms', { method: 'POST' });
    setUser(data.user); setCurrentTermsVersion(data.currentTermsVersion);
    setTrip(null);
  }, []);

  const acceptTerms = useCallback(async () => {
    const data = await api('/auth/accept-terms', { method: 'POST' });
    setUser(data.user); setCurrentTermsVersion(data.currentTermsVersion);
  }, []);

  const logout = useCallback(() => {
    signOut(auth);
  }, []);

  const createTrip = useCallback(async () => {
    const data = await api('/trips', { method: 'POST', json: {} });
    setTrip(data.trip);
  }, []);

  const joinTrip = useCallback(async (code: string) => {
    const data = await api('/trips/join', { method: 'POST', json: { code } });
    setTrip(data.trip);
  }, []);

  const updateMe = useCallback(async (patch: Record<string, any>) => {
    const data = await api('/auth/me', { method: 'PATCH', json: patch });
    setUser(data.user);
  }, []);

  return (
    <Ctx.Provider value={{ user, trip, loading, currentTermsVersion, login, signup, logout, createTrip, joinTrip, refresh: loadProfile, updateMe, acceptTerms }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
