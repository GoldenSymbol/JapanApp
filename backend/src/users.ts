import { adminDb } from "./firebaseAdmin.js";

const DEFAULT_PREFS = { weather: true, offlineSave: false, autoSync: true };
const DEFAULT_NOTIF_PREFS = { newAttraction: true, newDestination: true, reschedule: true, newExpense: true };

function usersCol() {
  return adminDb.collection("users");
}

export function publicUser(uid: string, d: any) {
  return {
    id: uid,
    name: d.name,
    email: d.email,
    avatarColor: d.avatarColor || "#B23A32",
    photoUrl: d.photoUrl ?? null,
    darkMode: d.darkMode ?? true,
    palette: d.palette || "paper",
    uiLang: d.uiLang || "he",
    baseCurrency: d.baseCurrency || "ILS",
    prefs: { ...DEFAULT_PREFS, ...(d.prefs || {}) },
    notifPrefs: { ...DEFAULT_NOTIF_PREFS, ...(d.notifPrefs || {}) },
  };
}

export async function getUserDoc(uid: string) {
  const doc = await usersCol().doc(uid).get();
  return doc.exists ? doc.data()! : null;
}

export async function getUserName(uid: string): Promise<string | null> {
  const d = await getUserDoc(uid);
  return d?.name || null;
}

// Called once right after a Firebase Auth signup — creates the matching profile doc
// (keyed by the Firebase uid) if it doesn't exist yet.
export async function ensureUser(uid: string, name?: string, email?: string) {
  const ref = usersCol().doc(uid);
  const doc = await ref.get();
  if (doc.exists) return doc.data()!;
  const data = {
    name: name || "משתמש",
    email: String(email || "").toLowerCase(),
    avatarColor: "#B23A32",
    photoUrl: null,
    darkMode: true,
    palette: "paper",
    uiLang: "he",
    baseCurrency: "ILS",
    prefs: { ...DEFAULT_PREFS },
    notifPrefs: { ...DEFAULT_NOTIF_PREFS },
  };
  await ref.set(data);
  return data;
}

export async function patchUser(uid: string, patch: Record<string, any>) {
  if (Object.keys(patch).length) await usersCol().doc(uid).update(patch);
  return (await getUserDoc(uid))!;
}
