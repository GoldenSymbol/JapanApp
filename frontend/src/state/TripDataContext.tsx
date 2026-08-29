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
  nights: number;
  attractionCount: number;
}

interface TripDataState {
  destinations: Destination[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<TripDataState | null>(null);

export function TripDataProvider({ children }: { children: ReactNode }) {
  const { trip } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!trip) { setDestinations([]); setLoading(false); return; }
    setLoading(true);
    const data = await api('/destinations');
    setDestinations(data.destinations);
    setLoading(false);
  }, [trip]);

  useEffect(() => { refresh(); }, [refresh]);

  return <Ctx.Provider value={{ destinations, loading, refresh }}>{children}</Ctx.Provider>;
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
