import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

export interface Destination {
  id: string;
  order: number;
  nameHe: string;
  nameEn: string;
  nameJa: string;
  startDate: string;
  endDate: string;
  transportIn: string;
  colorKey: string;
  lat: number | null;
  lng: number | null;
  teaser: string | null;
  notes: string;
  nights: number;
  attractionCount: number;
  groupId: string;
}

export interface TripMember { id: string; name: string; email: string; avatarColor: string; role: string; }
export interface TripMeta {
  id: string; name: string; code: string; ownerId: string; budgetTotal: number;
  members: TripMember[];
  pendingInvites: { email: string; created_at: string | null }[];
}

interface TripDataState {
  destinations: Destination[];
  loading: boolean;
  refresh: () => Promise<void>;
  // Fetched once alongside destinations (same trip-session lifecycle) rather than by each screen
  // that needs it — Members and Settings both used to independently re-fetch this same data on
  // every visit, which was the source of a visible delay/flash when opening Members: a blank
  // screen every time, waiting on a network round-trip whose result rarely differs from what was
  // already on screen a moment earlier. Screens now just read it here; refreshTripMeta() is there
  // for after an action that actually changes it (invite code rotated, member removed, etc).
  tripMeta: TripMeta | null;
  refreshTripMeta: () => Promise<void>;
}

const Ctx = createContext<TripDataState | null>(null);

export function TripDataProvider({ children }: { children: ReactNode }) {
  const { trip } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [tripMeta, setTripMeta] = useState<TripMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTripMeta = useCallback(async () => {
    if (!trip) { setTripMeta(null); return; }
    const data = await api('/trips/current');
    setTripMeta(data.trip);
  }, [trip]);

  const refresh = useCallback(async () => {
    if (!trip) { setDestinations([]); setTripMeta(null); setLoading(false); return; }
    setLoading(true);
    const [destData, tripData] = await Promise.all([api('/destinations'), api('/trips/current')]);
    setDestinations(destData.destinations);
    setTripMeta(tripData.trip);
    setLoading(false);
  }, [trip]);

  useEffect(() => { refresh(); }, [refresh]);

  return <Ctx.Provider value={{ destinations, loading, refresh, tripMeta, refreshTripMeta }}>{children}</Ctx.Provider>;
}

export function useTripData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTripData must be used within TripDataProvider');
  return ctx;
}

// darkCardHex -> { palette: lightTintHex }, from the design spec's per-palette card-tint table.
const CARD_TINTS: Record<string, Record<string, string>> = {
  '#1F2328': { paper: '#EEEAE2', sakura: '#F3E6E8', indigo: '#E6E9F1', matcha: '#E9ECE2' },
  '#243030': { paper: '#E6EDE9', sakura: '#EAEFEA', indigo: '#E4EDEC', matcha: '#E3EDE3' },
  '#2A2320': { paper: '#F0E7E0', sakura: '#F6E7E5', indigo: '#EFE9E6', matcha: '#EFEBE0' },
  '#2B2429': { paper: '#EFE7EC', sakura: '#F4E6EF', indigo: '#EDE7F0', matcha: '#EDE9E6' },
  '#232B30': { paper: '#E7EDF1', sakura: '#E9EDF3', indigo: '#E3EAF3', matcha: '#E6EDEB' },
  '#20272E': { paper: '#E8EDF2', sakura: '#EBEEF4', indigo: '#E5EBF4', matcha: '#E7EEE8' },
  '#1E2C2C': { paper: '#E4EFEC', sakura: '#E6F0EC', indigo: '#E2EFEC', matcha: '#E1EEE5' },
};

export function cityCardBg(darkHex: string, dark: boolean, palette: string): string {
  if (dark) return darkHex;
  return CARD_TINTS[darkHex]?.[palette] || darkHex;
}
