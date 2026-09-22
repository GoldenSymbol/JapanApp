import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile,
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
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  createTrip: () => Promise<void>;
  joinTrip: (code: string) => Promise<void>;
  refresh: () => Promise<void>;
  updateMe: (patch: Record<string, any>) => Promise<void>;
  acceptTerms: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

// Kept as a Hebrew fallback only, for any caller that reads .message directly without going
// through a translation lookup. The `error` field below carries the raw Firebase code (or
// 'weak_password') so UI components — which have access to useLanguage() — can show a properly
// localized message instead (see translations.ts's `authError.*` keys). AuthContext itself can't
// call useLanguage() here since LanguageProvider reads `user` from this same context and sits
// below it in the provider tree — a real circular dependency, not just plumbing friction.
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
  return new ApiError(400, { error: e?.code, message: AUTH_ERROR_MESSAGES[e?.code] || 'שגיאה, נסה שוב' });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [trip, setTrip] = useState<TripSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTermsVersion, setCurrentTermsVersion] = useState<string | null>(null);
  // login()/signup() call loadProfile() themselves (to know when it's safe to navigate) while
  // onAuthStateChanged also fires for that same sign-in and would otherwise call it again in
  // parallel — several redundant /auth/me requests per login. Worse, right after signup the
  // profile doc (written by /auth/bootstrap) can lag a beat behind Firestore's read path, so a
  // listener-triggered call racing the explicit one occasionally 404s and — since that path
  // isn't wrapped in try/catch — the raw "not_found" string used to leak to the user as the
  // on-screen error. This flag makes the explicit call authoritative and skips the listener's
  // duplicate while one is in flight.
  const explicitLoadInFlight = useRef(false);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const loadProfile = useCallback(async () => {
    let data;
    try {
      data = await api('/auth/me');
    } catch (e) {
      // A profile doc created moments ago (fresh signup, or a slow Firestore replica) can
      // briefly 404 even though it now exists — one short retry clears that without ever
      // showing the user a transient error.
      if (e instanceof ApiError && e.status === 404) {
        await sleep(600);
        data = await api('/auth/me');
      } else {
        throw e;
      }
    }
    setUser(data.user); setTrip(data.trip); setCurrentTermsVersion(data.currentTermsVersion);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { setUser(null); setTrip(null); setLoading(false); return; }
      if (explicitLoadInFlight.current) { setLoading(false); return; }
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
    explicitLoadInFlight.current = true;
    try {
      await loadProfile();
    } finally {
      explicitLoadInFlight.current = false;
    }
  }, [loadProfile]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e: any) {
      throw toApiError(e);
    }
  }, []);

  // Called only after Signup.tsx has confirmed the terms checkbox was checked — this always
  // records acceptance of the current terms right after creating the profile, in the same flow,
  // rather than leaving a freshly-created account to hit the terms gate on its very first screen.
  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (password.length < 8) throw new ApiError(400, { error: 'weak_password', message: 'הסיסמה צריכה להיות לפחות 8 תווים' });
    let cred;
    explicitLoadInFlight.current = true;
    try {
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
    } finally {
      explicitLoadInFlight.current = false;
    }
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
    <Ctx.Provider value={{ user, trip, loading, currentTermsVersion, login, signup, resetPassword, logout, createTrip, joinTrip, refresh: loadProfile, updateMe, acceptTerms }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
