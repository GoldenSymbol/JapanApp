import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot, doc, updateDoc, arrayUnion, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import type { Lang } from '../i18n/translations';

export interface Notification {
  id: string;
  type: string;
  title: string;
  titleKey: string | null;
  titleParams: Record<string, string | number> | null;
  body: string | null;
  actorName: string | null;
  targetScreen: string | null;
  targetId: string | null;
  createdAt: string;
  read: boolean;
}

// Resolves a notification to display text in the viewer's own language. Notifications written
// after titleKey/titleParams were added (see backend/src/context.ts) render via the dictionary,
// exactly like every other translated string; any nameHe/nameEn (or cityNameHe/cityNameEn) pair
// in the params picks a single name the same way LanguageContext's displayName() does elsewhere.
// Notifications written before this existed only have the old pre-rendered `title` — those fall
// back to that frozen (Hebrew) text rather than breaking.
export function notificationTitle(n: Notification, lang: Lang, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (!n.titleKey) return n.title;
  const p = n.titleParams || {};
  const pick = (he: unknown, en: unknown) => (lang === 'en' && en ? en : he) as string;
  switch (n.titleKey) {
    case 'notif.newDestination':
      return t(n.titleKey, { name: pick(p.nameHe, p.nameEn) });
    case 'notif.newAttraction':
      return t(n.titleKey, { city: pick(p.cityNameHe, p.cityNameEn), name: pick(p.nameHe, p.nameEn) });
    case 'notif.rescheduleDay':
      return t(n.titleKey, { name: pick(p.nameHe, p.nameEn), day: p.day ?? '' });
    case 'notif.rescheduleNone':
      return t(n.titleKey, { name: pick(p.nameHe, p.nameEn) });
    default:
      return t(n.titleKey, p);
  }
}

interface NotifState {
  notifications: Notification[];
  unreadCount: number;
  toast: Notification | null;
  dismissToast: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAll: () => Promise<void>;
}

const Ctx = createContext<NotifState | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { trip, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<Notification | null>(null);
  const isFirstLoad = useRef(true);
  const myId = user?.id;

  useEffect(() => {
    isFirstLoad.current = true;
    if (!trip || !myId) { setNotifications([]); return; }
    const q = query(collection(db, 'trips', trip.id, 'notifications'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      const list: Notification[] = snap.docs
        .map((d) => {
          const v = d.data();
          return {
            id: d.id,
            type: v.type,
            title: v.title,
            titleKey: v.titleKey ?? null,
            titleParams: v.titleParams ?? null,
            body: v.body ?? null,
            actorName: v.actorName ?? null,
            targetScreen: v.targetScreen ?? null,
            targetId: v.targetId ?? null,
            createdAt: v.createdAt?.toDate ? v.createdAt.toDate().toISOString() : new Date().toISOString(),
            read: (v.readBy || []).includes(myId),
            deletedBy: v.deletedBy || [],
          };
        })
        .filter((n: any) => !n.deletedBy.includes(myId))
        .map(({ deletedBy, ...n }: any) => n);

      if (!isFirstLoad.current) {
        const added = snap.docChanges().filter((c) => c.type === 'added');
        const fresh = added
          .map((c) => list.find((n) => n.id === c.doc.id))
          .find((n) => n && !n.read);
        if (fresh) setToast(fresh);
      }
      isFirstLoad.current = false;
      setNotifications(list);
    });
    return unsub;
  }, [trip, myId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const markRead = useCallback(async (id: string) => {
    if (!trip || !myId) return;
    await updateDoc(doc(db, 'trips', trip.id, 'notifications', id), { readBy: arrayUnion(myId) });
  }, [trip, myId]);

  const markAllRead = useCallback(async () => {
    if (!trip || !myId) return;
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    for (const n of unread) batch.update(doc(db, 'trips', trip.id, 'notifications', n.id), { readBy: arrayUnion(myId) });
    await batch.commit();
  }, [trip, myId, notifications]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!trip || !myId) return;
    await updateDoc(doc(db, 'trips', trip.id, 'notifications', id), { deletedBy: arrayUnion(myId) });
  }, [trip, myId]);

  const deleteAll = useCallback(async () => {
    if (!trip || !myId || !notifications.length) return;
    const batch = writeBatch(db);
    for (const n of notifications) batch.update(doc(db, 'trips', trip.id, 'notifications', n.id), { deletedBy: arrayUnion(myId) });
    await batch.commit();
  }, [trip, myId, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Ctx.Provider value={{
      notifications, unreadCount, toast, dismissToast: () => setToast(null),
      markRead, markAllRead, deleteNotification, deleteAll,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
