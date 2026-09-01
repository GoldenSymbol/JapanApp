import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  actorName: string | null;
  targetScreen: string | null;
  targetId: string | null;
  createdAt: string;
  read: boolean;
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
  refresh: () => Promise<void>;
}

const Ctx = createContext<NotifState | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { trip } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<Notification | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const refresh = useCallback(async () => {
    if (!trip) return;
    const data = await api('/notifications');
    const list: Notification[] = data.notifications;
    if (!isFirstLoad.current) {
      const fresh = list.find((n) => !seenIds.current.has(n.id) && !n.read);
      if (fresh) setToast(fresh);
    }
    list.forEach((n) => seenIds.current.add(n.id));
    isFirstLoad.current = false;
    setNotifications(list);
    setUnreadCount(data.unreadCount);
  }, [trip]);

  useEffect(() => {
    if (!trip) return;
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [trip, refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const markRead = useCallback(async (id: string) => {
    await api(`/notifications/${id}/read`, { method: 'POST' });
    await refresh();
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    await api('/notifications/read-all', { method: 'POST' });
    await refresh();
  }, [refresh]);

  const deleteNotification = useCallback(async (id: string) => {
    await api(`/notifications/${id}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  const deleteAll = useCallback(async () => {
    await api('/notifications/delete-all', { method: 'POST' });
    await refresh();
  }, [refresh]);

  return (
    <Ctx.Provider value={{ notifications, unreadCount, toast, dismissToast: () => setToast(null), markRead, markAllRead, deleteNotification, deleteAll, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
