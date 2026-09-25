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

export interface BudgetCategory { id: string; name: string; planned: number; spent: number; note: string | null; percent: number; }
export interface BudgetSnapshot { total: number; paid: number; categories: BudgetCategory[]; }

export interface DocumentFolder { id: string; name: string; colorKey: string; fileCount: number; }

export interface Attraction {
  id: string; nameHe: string; nameEn: string; tag: string; duration: string | null;
  day: string | null; hour: string | null; note: string | null;
  lat: number | null; lng: number | null; myStatus: string; othersStatus: string[];
}

interface TripDataState {
  destinations: Destination[];
  loading: boolean;
  refresh: () => Promise<void>;
  // Everything below is fetched once alongside destinations (same trip-session lifecycle) rather
  // than by each screen that needs it. Members, Settings, Budget and Documents each used to
  // independently fetch their own slice on every visit and block rendering until it resolved —
  // the source of a visible delay/flash every single time, waiting on a network round-trip whose
  // result rarely differs from what was already on screen a moment earlier. Screens now just read
  // their slice here; each has its own refresh*() for after an action that actually changes it.
  tripMeta: TripMeta | null;
  refreshTripMeta: () => Promise<void>;
  budget: BudgetSnapshot | null;
  refreshBudget: () => Promise<void>;
  personalBudget: BudgetSnapshot | null;
  refreshPersonalBudget: () => Promise<void>;
  documentFolders: DocumentFolder[];
  refreshDocumentFolders: () => Promise<void>;
  // Attractions are per-destination rather than one trip-wide singleton, and a trip can have many
  // destinations — eagerly fetching every destination's attractions at app load (the way the
  // singletons above are handled) would trade one delay for a worse one. Instead this is a lazy,
  // shared cache keyed by destination id: City, Today and the map's city view each used to fetch
  // "the attractions for the currently-active destination" independently, so switching between
  // them re-fetched (and re-blocked on) the very same data every time. ensureAttractions() only
  // fetches a destination's attractions the first time any screen asks for them in this session;
  // every screen after that reads the same cached array instantly. refreshAttractions() forces a
  // refetch after a mutation (add/remove/toggle/reschedule/...), and every screen sees the update
  // immediately since they all read the same cache. setAttractionsLocal() exists only for City's
  // drag-to-reorder, which needs to move items around optimistically while dragging without
  // waiting on a round trip.
  attractionsByDestination: Record<string, Attraction[]>;
  ensureAttractions: (destId: string) => Promise<void>;
  refreshAttractions: (destId: string) => Promise<void>;
  setAttractionsLocal: (destId: string, spots: Attraction[]) => void;
}

const Ctx = createContext<TripDataState | null>(null);

export function TripDataProvider({ children }: { children: ReactNode }) {
  const { trip } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [tripMeta, setTripMeta] = useState<TripMeta | null>(null);
  const [budget, setBudget] = useState<BudgetSnapshot | null>(null);
  const [personalBudget, setPersonalBudget] = useState<BudgetSnapshot | null>(null);
  const [documentFolders, setDocumentFolders] = useState<DocumentFolder[]>([]);
  const [attractionsByDestination, setAttractionsByDestination] = useState<Record<string, Attraction[]>>({});
  const [loading, setLoading] = useState(true);

  const refreshTripMeta = useCallback(async () => {
    if (!trip) { setTripMeta(null); return; }
    const data = await api('/trips/current');
    setTripMeta(data.trip);
  }, [trip]);
  const refreshBudget = useCallback(async () => {
    if (!trip) { setBudget(null); return; }
    setBudget(await api('/budget'));
  }, [trip]);
  const refreshPersonalBudget = useCallback(async () => {
    if (!trip) { setPersonalBudget(null); return; }
    setPersonalBudget(await api('/budget/personal'));
  }, [trip]);
  const refreshDocumentFolders = useCallback(async () => {
    if (!trip) { setDocumentFolders([]); return; }
    const data = await api('/documents/folders');
    setDocumentFolders(data.folders);
  }, [trip]);
  const refreshAttractions = useCallback(async (destId: string) => {
    const data = await api(`/destinations/${destId}/attractions`);
    setAttractionsByDestination((m) => ({ ...m, [destId]: data.attractions }));
  }, []);
  const ensureAttractions = useCallback(async (destId: string) => {
    if (attractionsByDestination[destId]) return;
    await refreshAttractions(destId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attractionsByDestination, refreshAttractions]);
  const setAttractionsLocal = useCallback((destId: string, spots: Attraction[]) => {
    setAttractionsByDestination((m) => ({ ...m, [destId]: spots }));
  }, []);

  const refresh = useCallback(async () => {
    if (!trip) {
      setDestinations([]); setTripMeta(null); setBudget(null); setPersonalBudget(null); setDocumentFolders([]);
      setAttractionsByDestination({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const [destData, tripData, budgetData, personalData, foldersData] = await Promise.all([
      api('/destinations'), api('/trips/current'), api('/budget'), api('/budget/personal'), api('/documents/folders'),
    ]);
    setDestinations(destData.destinations);
    setTripMeta(tripData.trip);
    setBudget(budgetData);
    setPersonalBudget(personalData);
    setDocumentFolders(foldersData.folders);
    setAttractionsByDestination({});
    setLoading(false);
  }, [trip]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <Ctx.Provider value={{
      destinations, loading, refresh,
      tripMeta, refreshTripMeta,
      budget, refreshBudget,
      personalBudget, refreshPersonalBudget,
      documentFolders, refreshDocumentFolders,
      attractionsByDestination, ensureAttractions, refreshAttractions, setAttractionsLocal,
    }}>
      {children}
    </Ctx.Provider>
  );
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
