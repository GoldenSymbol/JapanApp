import { openDB, type IDBPDatabase } from 'idb';
import type { Attraction, BudgetSnapshot, Destination, DocumentFolder, TripMeta } from './TripDataContext';
import type { TripSummary, User } from './AuthContext';

// Last-known-good snapshot of everything TripDataContext holds, so the app has something to
// show the moment it loads with no network at all — not a general-purpose sync engine, just a
// single write-through cache keyed by trip id. Keyed by trip id (not a fixed key) so switching
// trips on the same device never shows the wrong trip's stale data.
export interface TripSnapshot {
  tripId: string;
  destinations: Destination[];
  tripMeta: TripMeta | null;
  budget: BudgetSnapshot | null;
  personalBudget: BudgetSnapshot | null;
  documentFolders: DocumentFolder[];
  attractionsByDestination: Record<string, Attraction[]>;
  savedAt: number;
}

// Same idea, one level up: the profile fetched from /auth/me on every page load. Without this,
// reloading the app offline never even reaches TripDataContext — AuthContext's own bootstrap
// fetch fails first and, unchecked, would look identical to "not logged in".
export interface AuthSnapshot {
  uid: string;
  user: User;
  trip: TripSummary | null;
  currentTermsVersion: string | null;
  savedAt: number;
}

const DB_NAME = 'michiplan-offline';
const DB_VERSION = 2;
const TRIP_STORE = 'tripSnapshots';
const AUTH_STORE = 'authSnapshots';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(TRIP_STORE)) {
          db.createObjectStore(TRIP_STORE, { keyPath: 'tripId' });
        }
        if (!db.objectStoreNames.contains(AUTH_STORE)) {
          db.createObjectStore(AUTH_STORE, { keyPath: 'uid' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveTripSnapshot(snapshot: Omit<TripSnapshot, 'savedAt'>) {
  try {
    const db = await getDb();
    await db.put(TRIP_STORE, { ...snapshot, savedAt: Date.now() });
  } catch {
    // IndexedDB can be unavailable (private browsing, storage disabled) — the cache is a nice-
    // to-have for offline viewing, so a write failure here should never break saving the trip.
  }
}

export async function loadTripSnapshot(tripId: string): Promise<TripSnapshot | null> {
  try {
    const db = await getDb();
    return (await db.get(TRIP_STORE, tripId)) ?? null;
  } catch {
    return null;
  }
}

export async function saveAuthSnapshot(snapshot: Omit<AuthSnapshot, 'savedAt'>) {
  try {
    const db = await getDb();
    await db.put(AUTH_STORE, { ...snapshot, savedAt: Date.now() });
  } catch {
    // Same rationale as saveTripSnapshot — never let a cache write failure break login.
  }
}

export async function loadAuthSnapshot(uid: string): Promise<AuthSnapshot | null> {
  try {
    const db = await getDb();
    return (await db.get(AUTH_STORE, uid)) ?? null;
  } catch {
    return null;
  }
}
