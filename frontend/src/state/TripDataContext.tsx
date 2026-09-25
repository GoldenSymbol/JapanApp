import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, isServerUnreachable } from '../api';
import { useAuth } from './AuthContext';
import { loadTripSnapshot, saveTripSnapshot } from './offlineCache';

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
  // True once a refresh has actually failed for lack of network — everything currently in state
  // is then the last snapshot successfully saved to IndexedDB, not necessarily current. Reading
  // still works while this is true; writes (add/edit/delete actions) are not yet queued for
  // later sync and will simply fail — that's the next phase of this feature, not this one.
  offline: boolean;
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
  const [offline, setOffline] = useState(false);
  const tripId = trip?.id;

  const refreshTripMeta = useCallback(async () => {
    if (!trip) { setTripMeta(null); return; }
    try {
      const data = await api('/trips/current');
      setTripMeta(data.trip);
    } catch (err) {
      if (!isServerUnreachable(err)) throw err;
    }
  }, [trip]);
  const refreshBudget = useCallback(async () => {
    if (!trip) { setBudget(null); return; }
    try {
      setBudget(await api('/budget'));
    } catch (err) {
      if (!isServerUnreachable(err)) throw err;
    }
  }, [trip]);
  const refreshPersonalBudget = useCallback(async () => {
    if (!trip) { setPersonalBudget(null); return; }
    try {
      setPersonalBudget(await api('/budget/personal'));
    } catch (err) {
      if (!isServerUnreachable(err)) throw err;
    }
  }, [trip]);
  const refreshDocumentFolders = useCallback(async () => {
    if (!trip) { setDocumentFolders([]); return; }
    try {
      const data = await api('/documents/folders');
      setDocumentFolders(data.folders);
    } catch (err) {
      if (!isServerUnreachable(err)) throw err;
    }
  }, [trip]);
  const refreshAttractions = useCallback(async (destId: string) => {
    try {
      const data = await api(`/destinations/${destId}/attractions`);
      setAttractionsByDestination((m) => ({ ...m, [destId]: data.attractions }));
    } catch (err) {
      if (!isServerUnreachable(err)) throw err;
      // Offline and nothing fetched — fall back to this destination's slice of the last saved
      // snapshot, if there is one, rather than leaving the screen with no data at all.
      if (!tripId) return;
      const snapshot = await loadTripSnapshot(tripId);
      const cached = snapshot?.attractionsByDestination[destId];
      if (cached) setAttractionsByDestination((m) => ({ ...m, [destId]: cached }));
    }
  }, [tripId]);
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
      setOffline(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [destData, tripData, budgetData, personalData, foldersData] = await Promise.all([
        api('/destinations'), api('/trips/current'), api('/budget'), api('/budget/personal'), api('/documents/folders'),
      ]);
      setDestinations(destData.destinations);
      setTripMeta(tripData.trip);
      setBudget(budgetData);
      setPersonalBudget(personalData);
      setDocumentFolders(foldersData.folders);
      setAttractionsByDestination({});
      setOffline(false);
    } catch (err) {
      if (!isServerUnreachable(err)) throw err;
      // No network — fall back to the last snapshot this trip saved successfully, if any, so
      // the app shows the last-known trip instead of a blank screen. Attractions the user never
      // visited this session (or ever, on this device) simply won't be there; ensureAttractions
      // has its own fallback for that per destination.
      const snapshot = await loadTripSnapshot(trip.id);
      if (snapshot) {
        setDestinations(snapshot.destinations);
        setTripMeta(snapshot.tripMeta);
        setBudget(snapshot.budget);
        setPersonalBudget(snapshot.personalBudget);
        setDocumentFolders(snapshot.documentFolders);
        setAttractionsByDestination(snapshot.attractionsByDestination);
      }
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [trip]);

  useEffect(() => { refresh(); }, [refresh]);

  // Write-through: whenever this trip's data actually changes post-load, save a fresh snapshot
  // so a later offline load has something recent to fall back to. Runs after every successful
  // fetch and every local mutation (including the optimistic drag-reorder in City.tsx) — cheap,
  // and simpler/more robust than threading an explicit save call through every call site that
  // changes one of these.
  useEffect(() => {
    if (!tripId || loading) return;
    saveTripSnapshot({ tripId, destinations, tripMeta, budget, personalBudget, documentFolders, attractionsByDestination });
  }, [tripId, loading, destinations, tripMeta, budget, personalBudget, documentFolders, attractionsByDestination]);

  // The 'offline' event fires the moment the OS reports no connectivity — flip the banner on
  // right away rather than waiting for some future request to fail. 'online' is a hint, not a
  // guarantee (captive portals etc. can lie), so it just triggers a real refresh(); if that
  // still fails, the catch above puts offline back to true.
  useEffect(() => {
    function handleOffline() { setOffline(true); }
    function handleOnline() { refresh(); }
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [refresh]);

  return (
    <Ctx.Provider value={{
      destinations, loading, refresh, offline,
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
