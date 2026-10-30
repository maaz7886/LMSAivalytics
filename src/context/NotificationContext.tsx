'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BroadcastNotification } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { formatTimeAgo } from '@/lib/dateUtils';

export interface LMSNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  priority: 'Normal' | 'Important' | 'Urgent';
  unread: boolean;
  type: 'broadcast' | 'system' | 'session' | 'ticket' | 'info' | 'warning' | 'success' | 'alert';
  targetType: 'all' | 'course' | 'individual';
  targetValue?: string;
  broadcastId?: string;
  actionUrl?: string;
  createdAt: number;
}

interface NotificationContextType {
  broadcasts: BroadcastNotification[];
  notifications: LMSNotification[];
  unreadCount: number;
  sendBroadcast: (data: Omit<BroadcastNotification, 'id' | 'sentAt' | 'readCount'>) => BroadcastNotification;
  sendNotification: (data: {
    title: string;
    message: string;
    priority?: 'Normal' | 'Important' | 'Urgent';
    type?: 'ticket' | 'broadcast' | 'session' | 'info' | 'warning' | 'success' | 'alert';
    targetType?: 'all' | 'course' | 'individual';
    targetValue?: string;
    actionUrl?: string;
  }) => Promise<void>;
  deleteBroadcast: (id: string) => void;
  cancelBroadcast: (id: string) => void;
  cancelNotification: (id: string) => void;
  dismissNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  activeAlert: LMSNotification | null;
  dismissAlert: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const BROADCASTS_STORAGE_KEY = 'aivalytics_broadcasts_v1';
const READ_NOTIFICATIONS_KEY = 'aivalytics_read_notifications_v1';
const DISMISSED_NOTIFICATIONS_KEY = 'aivalytics_dismissed_notifications_v1';
const CHANNEL_NAME = 'realtime:notifications';


// Map Postgres row to LMSNotification
function mapDbRowToNotif(row: any, readIds: Record<string, boolean>): LMSNotification {
  const priority: 'Normal' | 'Important' | 'Urgent' =
    row.type === 'alert' ? 'Urgent' : row.type === 'warning' ? 'Important' : 'Normal';

  return {
    id: row.id,
    title: row.title,
    message: row.message,
    time: row.createdAt ? formatTimeAgo(new Date(row.createdAt)) : 'Just now',
    priority,
    unread: !row.read && !readIds[row.id],
    type: row.type === 'alert' || row.type === 'warning' ? 'broadcast' : row.type || 'info',
    targetType: row.userId ? 'individual' : 'all',
    targetValue: row.userId || undefined,
    broadcastId: row.id,
    createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
  };
}

// Web Audio API notification chime generator (zero external assets needed)
const playNotificationChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Pleasant two-tone chime: D5 (587Hz) then A5 (880Hz)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Ignore audio autoplay restrictions
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Local broadcasts list (starts empty for identical initial SSR render tree)
  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>([]);

  // DB-synced notifications
  const [dbNotifications, setDbNotifications] = useState<LMSNotification[]>([]);

  // Read notifications set (notificationId -> boolean)
  const [readIds, setReadIds] = useState<Record<string, boolean>>({});

  // Dismissed / Cancelled notifications set
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});

  // Hydrate from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedBroadcasts = localStorage.getItem(BROADCASTS_STORAGE_KEY);
        if (savedBroadcasts) {
          setBroadcasts(JSON.parse(savedBroadcasts));
        }
      } catch (err) {
        console.error('Failed to load broadcasts from localStorage', err);
      }

      try {
        const savedRead = localStorage.getItem(READ_NOTIFICATIONS_KEY);
        if (savedRead) {
          setReadIds(JSON.parse(savedRead));
        }
      } catch (err) {
        console.error('Failed to load read notifications from localStorage', err);
      }

      try {
        const savedDismissed = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
        if (savedDismissed) {
          setDismissedIds(JSON.parse(savedDismissed));
        }
      } catch (err) {
        console.error('Failed to load dismissed notifications from localStorage', err);
      }
    }
  }, []);

  // Active incoming alert for real-time pop-up notification
  const [activeAlert, setActiveAlert] = useState<LMSNotification | null>(null);

  // Sync broadcasts to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(BROADCASTS_STORAGE_KEY, JSON.stringify(broadcasts));
      } catch (err) {
        console.error('Failed to persist broadcasts to localStorage', err);
      }
    }
  }, [broadcasts]);

  // Sync read state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(readIds));
      } catch (err) {
        console.error('Failed to persist read notifications to localStorage', err);
      }
    }
  }, [readIds]);

  // Sync dismissed state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(dismissedIds));
      } catch (err) {
        console.error('Failed to persist dismissed notifications to localStorage', err);
      }
    }
  }, [dismissedIds]);

  // Keep live references to avoid stale closures in realtime listeners
  const readIdsRef = useRef(readIds);
  useEffect(() => {
    readIdsRef.current = readIds;
  }, [readIds]);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Supabase Realtime & Postgres Synchronization Engine
  useEffect(() => {
    // 1. Fetch initial notifications from Supabase Postgres
    const fetchInitial = async () => {
      try {
        const { data, error } = await supabase
          .from('Notification')
          .select('*')
          .order('createdAt', { ascending: false })
          .limit(30);

        if (error) {
          console.warn('Supabase fetch initial notifications notice:', error.message);
          return;
        }

        if (data && data.length > 0) {
          setDbNotifications(data.map((row) => mapDbRowToNotif(row, readIdsRef.current)));
        } else {
          setDbNotifications([]);
        }
      } catch (err) {
        console.error('Error fetching initial notifications:', err);
      }
    };

    fetchInitial();

    // 2. Subscribe to incoming notifications and broadcasts via Supabase Realtime
    const channel = supabase
      .channel(CHANNEL_NAME)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Notification' },
        (payload) => {
          const row = payload.new;
          const newNotif = mapDbRowToNotif(row, readIdsRef.current);

          setDbNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });

          // Check targeting
          const currentUserEmail = userRef.current?.email?.toLowerCase();
          const isTargeted =
            newNotif.targetType === 'all' ||
            (newNotif.targetType === 'individual' && newNotif.targetValue?.toLowerCase() === currentUserEmail);

          if (isTargeted) {
            playNotificationChime();
            setActiveAlert(newNotif);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Notification' },
        (payload) => {
          const row = payload.new;
          setDbNotifications((prev) =>
            prev.map((n) => (n.id === row.id ? { ...n, unread: !row.read } : n))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'Notification' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setDbNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          }
        }
      )
      .on(
        'broadcast',
        { event: 'announcement' },
        ({ payload }) => {
          if (!payload) return;
          playNotificationChime();
          const ephemeralNotif: LMSNotification = {
            id: payload.id || `ephemeral_${Date.now()}`,
            title: payload.title,
            message: payload.message,
            time: 'Just now',
            priority: payload.priority || (payload.type === 'alert' ? 'Urgent' : 'Important'),
            unread: true,
            type: 'broadcast',
            targetType: payload.targetType || 'all',
            targetValue: payload.targetValue,
            broadcastId: payload.broadcastId,
            createdAt: Date.now(),
          };

          setDbNotifications((prev) => {
            if (prev.some((n) => n.id === ephemeralNotif.id)) return prev;
            return [ephemeralNotif, ...prev];
          });

          setActiveAlert(ephemeralNotif);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Send Broadcast function (callable by Admin)
  const sendBroadcast = useCallback(
    (data: Omit<BroadcastNotification, 'id' | 'sentAt' | 'readCount'>): BroadcastNotification => {
      const bcId = `bc_${Date.now()}`;
      const newBroadcast: BroadcastNotification = {
        ...data,
        id: bcId,
        sentAt: 'Just now',
        readCount: 0,
      };

      setBroadcasts((prev) => [newBroadcast, ...prev]);

      const notifType =
        data.priority === 'Urgent' ? 'alert' : data.priority === 'Important' ? 'warning' : 'info';

      const notifId = `notif_${bcId}`;
      const newNotif: LMSNotification = {
        id: notifId,
        title: newBroadcast.title,
        message: newBroadcast.message,
        time: 'Just now',
        priority: newBroadcast.priority,
        unread: true,
        type: 'broadcast',
        targetType: newBroadcast.targetType,
        targetValue: newBroadcast.targetValue,
        broadcastId: bcId,
        createdAt: Date.now(),
      };

      // IMMEDIATELY add to dbNotifications so it renders in the notification dropdown without delay!
      setDbNotifications((prev) => [newNotif, ...prev]);

      // 1. Send Ephemeral Broadcast via Supabase Realtime channel
      try {
        const channel = supabase.channel(CHANNEL_NAME);
        channel.send({
          type: 'broadcast',
          event: 'announcement',
          payload: {
            ...newNotif,
            totalTargetCount: data.totalTargetCount,
          },
        });
      } catch (err) {
        console.error('Supabase broadcast send failed:', err);
      }

      // 2. Persistent Database Insert to Supabase Postgres 'Notification' table
      (async () => {
        try {
          const { data: inserted } = await supabase
            .from('Notification')
            .insert([
              {
                title: data.title,
                message: data.message,
                type: notifType,
                userId: data.targetType === 'individual' ? data.targetValue : null,
                read: false,
              },
            ])
            .select()
            .single();

          if (inserted) {
            setDbNotifications((prev) =>
              prev.map((n) => (n.id === notifId ? { ...n, id: inserted.id } : n))
            );
          }
        } catch (err) {
          console.error('Supabase Notification DB insert failed:', err);
        }
      })();

      // Trigger local sound & alert banner
      playNotificationChime();
      setActiveAlert(newNotif);

      return newBroadcast;
    },
    []
  );

  // Send Direct / System Notification (for tickets, evaluation, attendance, etc.)
  const sendNotification = useCallback(
    async (data: {
      title: string;
      message: string;
      priority?: 'Normal' | 'Important' | 'Urgent';
      type?: 'ticket' | 'broadcast' | 'session' | 'info' | 'warning' | 'success' | 'alert';
      targetType?: 'all' | 'course' | 'individual';
      targetValue?: string;
      actionUrl?: string;
    }) => {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const notifType = data.type || 'info';
      const newNotif: LMSNotification = {
        id: notifId,
        title: data.title,
        message: data.message,
        time: 'Just now',
        priority: data.priority || 'Normal',
        unread: true,
        type: notifType,
        targetType: data.targetType || 'all',
        targetValue: data.targetValue,
        actionUrl: data.actionUrl,
        createdAt: Date.now(),
      };

      setDbNotifications((prev) => [newNotif, ...prev]);

      try {
        const channel = supabase.channel(CHANNEL_NAME);
        channel.send({
          type: 'broadcast',
          event: 'announcement',
          payload: newNotif,
        });
      } catch (err) {
        console.error('Supabase notification broadcast failed:', err);
      }

      try {
        await supabase.from('Notification').insert([
          {
            title: data.title,
            message: data.message,
            type: notifType,
            userId: data.targetType === 'individual' ? data.targetValue : null,
            read: false,
          },
        ]);
      } catch (err) {
        console.error('Supabase Notification DB insert failed:', err);
      }

      playNotificationChime();
      setActiveAlert(newNotif);
    },
    []
  );

  // Cancel / Delete a notification completely
  const cancelNotification = useCallback((id: string) => {
    // 1. Mark as dismissed in localStorage state
    setDismissedIds((prev) => ({ ...prev, [id]: true }));

    // 2. Remove immediately from dbNotifications
    setDbNotifications((prev) =>
      prev.filter((n) => n.id !== id && n.broadcastId !== id && `notif_${n.broadcastId}` !== id)
    );

    // 3. Remove from broadcasts if it's a broadcast
    setBroadcasts((prev) =>
      prev.filter(
        (bc) =>
          bc.id !== id &&
          `notif_${bc.id}` !== id &&
          `bc_notif_${bc.id}` !== id &&
          !id.includes(bc.id)
      )
    );

    // 4. Dismiss active alert banner if matched
    setActiveAlert((curr) =>
      curr?.id === id || curr?.broadcastId === id || curr?.id?.includes(id) ? null : curr
    );

    // 5. Delete from Supabase Notification table if persisted in DB
    (async () => {
      try {
        await supabase.from('Notification').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete notification from DB:', err);
      }
    })();
  }, []);

  const dismissNotification = cancelNotification;
  const deleteBroadcast = cancelNotification;
  const cancelBroadcast = cancelNotification;

  // Compute targeted notifications for the current active user
  const notifications: LMSNotification[] = useMemo(() => {
    const userEmail = user?.email?.toLowerCase() || '';
    const isAdmin = user?.role === 'admin';

    // 1. Map broadcasts into LMSNotification format
    const broadcastNotifs: LMSNotification[] = broadcasts.map((bc) => ({
      id: bc.id.startsWith('notif_') || bc.id.startsWith('bc_notif_') ? bc.id : `bc_notif_${bc.id}`,
      title: bc.title,
      message: bc.message,
      time: bc.sentAt || 'Just now',
      priority: bc.priority,
      unread: !readIds[bc.id] && !readIds[`bc_notif_${bc.id}`] && !readIds[`notif_${bc.id}`],
      type: 'broadcast',
      targetType: bc.targetType,
      targetValue: bc.targetValue,
      broadcastId: bc.id,
      createdAt: Date.now(),
    }));

    // 2. Combine with dbNotifications, deduplicating by ID or title+message
    const combined: LMSNotification[] = [...dbNotifications];
    for (const bcn of broadcastNotifs) {
      const alreadyExists = combined.some(
        (n) =>
          n.id === bcn.id ||
          (n.broadcastId && n.broadcastId === bcn.broadcastId) ||
          (n.title === bcn.title && n.message === bcn.message)
      );
      if (!alreadyExists) {
        combined.push(bcn);
      }
    }

    // 3. Filter by dismissed and targeting
    return combined
      .filter((n) => {
        if (dismissedIds[n.id]) return false;
        if (n.broadcastId && dismissedIds[n.broadcastId]) return false;
        if (isAdmin) return true;
        if (n.targetType === 'all') return true;
        if (n.targetType === 'individual') {
          return n.targetValue?.toLowerCase() === userEmail;
        }
        return true;
      })
      .map((n) => ({
        ...n,
        unread: !readIds[n.id] && n.unread,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [dbNotifications, broadcasts, user, readIds, dismissedIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => ({ ...prev, [id]: true }));
    (async () => {
      try {
        await supabase.from('Notification').update({ read: true }).eq('id', id);
      } catch (err) {
        console.error('Failed to mark read in DB:', err);
      }
    })();
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = { ...prev };
      notifications.forEach((n) => {
        next[n.id] = true;
      });
      return next;
    });

    (async () => {
      try {
        await supabase.from('Notification').update({ read: true }).eq('read', false);
      } catch (err) {
        console.error('Failed to mark all read in DB:', err);
      }
    })();
  }, [notifications]);

  const dismissAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        broadcasts,
        notifications,
        unreadCount,
        sendBroadcast,
        sendNotification,
        deleteBroadcast,
        cancelBroadcast,
        cancelNotification,
        dismissNotification,
        markAsRead,
        markAllAsRead,
        activeAlert,
        dismissAlert,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
