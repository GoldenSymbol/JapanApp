import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken } from '../api';

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
}
export interface TripSummary { id: string; name: string; }

interface AuthState {
  user: User | null;
  trip: TripSummary | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  createTrip: () => Promise<void>;
  joinTrip: (code: string) => Promise<void>;
  refresh: () => Promise<void>;
  updateMe: (patch: Record<string, any>) => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [trip, setTrip] = useState<TripSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null); setTrip(null); setLoading(false);
      return;
    }
    try {
      const data = await api('/auth/me');
      setUser(data.user); setTrip(data.trip);
    } catch {
      setToken(null); setUser(null); setTrip(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api('/auth/login', { method: 'POST', json: { email, password } });
    setToken(data.token); setUser(data.user); setTrip(data.trip);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const data = await api('/auth/signup', { method: 'POST', json: { name, email, password } });
    setToken(data.token); setUser(data.user); setTrip(data.trip);
  }, []);

  const logout = useCallback(() => {
    setToken(null); setUser(null); setTrip(null);
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
    <Ctx.Provider value={{ user, trip, loading, login, signup, logout, createTrip, joinTrip, refresh, updateMe }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
