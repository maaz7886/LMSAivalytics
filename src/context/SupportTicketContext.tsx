'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { SupportTicket, TicketStatus, TicketCategory, TicketPriority, StudentFeedbackRating } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { supabase } from '@/lib/supabase/client';
import { formatTimeAgo } from '@/lib/dateUtils';

interface SupportTicketContextType {
  tickets: SupportTicket[];
  myTickets: SupportTicket[];
  getUserTickets: (email?: string, id?: string) => SupportTicket[];
  isLoading: boolean;
  openTicketsCount: number;
  underReviewCount: number;
  completedCount: number;
  myOpenTicketsCount: number;
  myUnderReviewCount: number;
  myCompletedCount: number;
  myTotalTicketsCount: number;
  createTicket: (data: {
    subject: string;
    description: string;
    course: string;
    category: TicketCategory;
    priority: TicketPriority;
    studentName?: string;
    studentEmail?: string;
  }) => Promise<SupportTicket>;
  respondToTicket: (data: {
    ticketId: string;
    status: TicketStatus;
    remarks: string;
    responderName?: string;
  }) => Promise<void>;
  submitStudentFeedback: (data: {
    ticketId: string;
    feedback: StudentFeedbackRating;
    feedbackNote?: string;
  }) => Promise<void>;
  refreshTickets: () => Promise<void>;
}

const SupportTicketContext = createContext<SupportTicketContextType | undefined>(undefined);

const TICKETS_STORAGE_KEY = 'aivalytics_support_tickets_v4';

function mapDbToUiTicket(row: any): SupportTicket {
  const code =
    row.ticketCode && row.ticketCode.trim() !== ''
      ? row.ticketCode
      : row.id
      ? 'TKT-' + (row.id.length > 8 ? row.id.slice(0, 4).toUpperCase() : row.id)
      : 'TKT-1001';

  // Normalize legacy status strings
  let normalizedStatus: TicketStatus = 'Open';
  if (row.status === 'RESOLVED' || row.status === 'Resolved' || row.status === 'Completed') {
    normalizedStatus = 'Completed';
  } else if (row.status === 'IN_PROGRESS' || row.status === 'In Progress' || row.status === 'Under Review') {
    normalizedStatus = 'Under Review';
  } else if (row.status === 'Rejected' || row.status === 'REJECTED') {
    normalizedStatus = 'Rejected';
  } else {
    normalizedStatus = 'Open';
  }

  return {
    id: row.id,
    ticketId: code,
    ticketCode: code,
    subject: row.subject || 'Support Request',
    course: row.course || 'AI-Native Project Management',
    category: (row.category as TicketCategory) || 'Academic',
    status: normalizedStatus,
    priority: (row.priority as TicketPriority) || 'Medium',
    createdAt: row.createdAt ? formatTimeAgo(new Date(row.createdAt)) : 'Just now',
    lastUpdated: row.updatedAt
      ? formatTimeAgo(new Date(row.updatedAt))
      : row.createdAt
      ? formatTimeAgo(new Date(row.createdAt))
      : 'Just now',
    repliesCount: (row.adminRemarks ? 1 : 0) + (row.studentFeedback ? 1 : 0),
    description: row.description || '',
    studentName: row.studentName || row.userId || 'Student',
    studentEmail: row.studentEmail || (row.userId?.includes('@') ? row.userId : ''),
    userId: row.userId || '',
    adminRemarks: row.adminRemarks || null,
    adminRespondedAt: row.adminRespondedAt ? formatTimeAgo(new Date(row.adminRespondedAt)) : null,
    adminRespondedBy: row.adminRespondedBy || null,
    studentFeedback: (row.studentFeedback as StudentFeedbackRating) || null,
    studentFeedbackNote: row.studentFeedbackNote || null,
    studentFeedbackAt: row.studentFeedbackAt ? formatTimeAgo(new Date(row.studentFeedbackAt)) : null,
  };
}

export const SupportTicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);

  // 1. Initial State starts empty on both server and client to guarantee identical initial render tree
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(TICKETS_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTickets(parsed);
          }
        }
      } catch (err) {
        console.error('Failed to parse cached tickets from localStorage', err);
      }
    }
  }, []);

  // Sync state to localStorage immediately whenever tickets change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
      } catch (err) {
        console.error('Failed to persist tickets to localStorage', err);
      }
    }
  }, [tickets]);

  // 2. Fetch and synchronize with Supabase Postgres
  const fetchTicketsFromDb = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('SupportTicket')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.warn('Supabase fetch SupportTicket error:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const dbTickets = data.map(mapDbToUiTicket);
        setTickets((prev) => {
          // Keep any optimistic local tickets that haven't synced yet
          const optimisticTickets = prev.filter(
            (local) => local.id.startsWith('tkt_opt_') && !dbTickets.some((db) => db.ticketCode === local.ticketCode)
          );
          return [...optimisticTickets, ...dbTickets];
        });
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error('Failed to load tickets from Supabase Postgres:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 3. Supabase Realtime Channel Subscription
  useEffect(() => {
    fetchTicketsFromDb();

    const channel = supabase
      .channel('realtime:support_tickets')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'SupportTicket' },
        (payload) => {
          const inserted = mapDbToUiTicket(payload.new);
          setTickets((prev) => {
            // Check if matches an optimistic ticket or already exists
            const alreadyExists = prev.some((t) => t.id === inserted.id || (t.ticketCode && t.ticketCode === inserted.ticketCode));
            if (alreadyExists) {
              return prev.map((t) =>
                t.id === inserted.id || t.ticketCode === inserted.ticketCode ? inserted : t
              );
            }
            return [inserted, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'SupportTicket' },
        (payload) => {
          const updated = mapDbToUiTicket(payload.new);
          setTickets((prev) =>
            prev.map((t) => (t.id === updated.id || t.ticketCode === updated.ticketCode ? updated : t))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTicketsFromDb]);

  // 4. Create Ticket (by Student)
  const createTicket = useCallback(
    async (data: {
      subject: string;
      description: string;
      course: string;
      category: TicketCategory;
      priority: TicketPriority;
      studentName?: string;
      studentEmail?: string;
    }): Promise<SupportTicket> => {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `TKT-${randomNum}`;
      const tempId = `tkt_opt_${Date.now()}`;
      const studentName = user?.name || data.studentName || 'Student';
      const studentEmail = user?.email || data.studentEmail || '';
      const userId = user?.id || '';

      const newUiTicket: SupportTicket = {
        id: tempId,
        ticketId: ticketCode,
        ticketCode: ticketCode,
        subject: data.subject.trim(),
        description: data.description.trim(),
        course: data.course,
        category: data.category,
        priority: data.priority,
        status: 'Open',
        createdAt: 'Just now',
        lastUpdated: 'Just now',
        repliesCount: 0,
        studentName,
        studentEmail,
        userId,
        adminRemarks: null,
        adminRespondedAt: null,
        adminRespondedBy: null,
        studentFeedback: null,
        studentFeedbackNote: null,
        studentFeedbackAt: null,
      };

      // Optimistically insert and persist to local storage immediately
      setTickets((prev) => [newUiTicket, ...prev]);

      // Notify Admin in Real-Time
      sendNotification({
        title: `New Support Ticket: ${ticketCode}`,
        message: `${studentName} filed: "${data.subject.slice(0, 48)}..." [${data.category} - ${data.priority} Priority]`,
        priority: data.priority === 'High' ? 'Urgent' : 'Normal',
        type: 'alert',
        targetType: 'all', // Broadcast to all admins & faculty
      });

      // Persist to Postgres
      try {
        const { data: dbRow, error } = await supabase
          .from('SupportTicket')
          .insert([
            {
              ticketCode,
              userId,
              studentName,
              studentEmail,
              subject: data.subject.trim(),
              description: data.description.trim(),
              course: data.course,
              category: data.category,
              priority: data.priority,
              status: 'Open',
            },
          ])
          .select()
          .single();

        if (error) {
          console.error('Supabase SupportTicket insert error:', error.message);
        } else if (dbRow) {
          const persistedTicket = mapDbToUiTicket(dbRow);
          setTickets((prev) =>
            prev.map((t) => (t.id === tempId ? persistedTicket : t))
          );
          return persistedTicket;
        }
      } catch (err) {
        console.error('Failed to persist ticket to PostgreSQL:', err);
      }

      return newUiTicket;
    },
    [user, sendNotification]
  );

  // 5. Respond to Ticket (by Admin)
  const respondToTicket = useCallback(
    async (data: {
      ticketId: string;
      status: TicketStatus;
      remarks: string;
      responderName?: string;
    }) => {
      const responderName = data.responderName || user?.name || 'Academic Support Faculty';
      const respondedAt = 'Just now';

      // Find the ticket being updated
      const existing = tickets.find((t) => t.id === data.ticketId || t.ticketCode === data.ticketId);

      // Optimistic state update
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === data.ticketId || t.ticketCode === data.ticketId) {
            return {
              ...t,
              status: data.status,
              adminRemarks: data.remarks.trim(),
              adminRespondedAt: respondedAt,
              adminRespondedBy: responderName,
              lastUpdated: 'Just now',
              repliesCount: t.repliesCount + (t.adminRemarks ? 0 : 1),
            };
          }
          return t;
        })
      );

      // Notify the Student in Real-Time
      const ticketCode = existing?.ticketCode || existing?.ticketId || 'TKT-TICKET';
      sendNotification({
        title: `Ticket Update: ${ticketCode}`,
        message: `${responderName} marked your ticket as "${data.status}". Remarks: "${data.remarks.slice(0, 60)}..."`,
        priority: 'Important',
        type: data.status === 'Completed' ? 'success' : 'info',
        targetType: existing?.studentEmail ? 'individual' : 'all',
        targetValue: existing?.studentEmail || undefined,
      });

      // Update in Supabase Postgres
      try {
        const updatePayload: Record<string, any> = {
          status: data.status,
          adminRemarks: data.remarks.trim(),
          adminRespondedAt: new Date().toISOString(),
          adminRespondedBy: responderName,
          updatedAt: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('SupportTicket')
          .update(updatePayload)
          .or(`id.eq.${data.ticketId},ticketCode.eq.${data.ticketId}`);

        if (error) {
          console.error('Supabase SupportTicket update error:', error.message);
        }
      } catch (err) {
        console.error('Failed to update ticket in PostgreSQL:', err);
      }
    },
    [tickets, user, sendNotification]
  );

  // 6. Submit Student Satisfaction Feedback (by Student)
  const submitStudentFeedback = useCallback(
    async (data: {
      ticketId: string;
      feedback: StudentFeedbackRating;
      feedbackNote?: string;
    }) => {
      const feedbackAt = 'Just now';
      const existing = tickets.find((t) => t.id === data.ticketId || t.ticketCode === data.ticketId);

      // If user marks not satisfied, status can remain 'Under Review' or 'Open'
      const updatedStatus: TicketStatus =
        data.feedback === 'Satisfied' ? 'Completed' : 'Under Review';

      // Optimistic update
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === data.ticketId || t.ticketCode === data.ticketId) {
            return {
              ...t,
              status: updatedStatus,
              studentFeedback: data.feedback,
              studentFeedbackNote: data.feedbackNote?.trim() || null,
              studentFeedbackAt: feedbackAt,
              lastUpdated: 'Just now',
              repliesCount: t.repliesCount + (t.studentFeedback ? 0 : 1),
            };
          }
          return t;
        })
      );

      // Notify Admin in Real-Time
      const ticketCode = existing?.ticketCode || existing?.ticketId || 'TKT-TICKET';
      sendNotification({
        title: `Student Feedback: ${ticketCode}`,
        message: `${existing?.studentName || 'Student'} rated ticket resolution as "${data.feedback}"${
          data.feedbackNote ? `: "${data.feedbackNote.slice(0, 50)}..."` : '.'
        }`,
        priority: data.feedback === 'Satisfied' ? 'Normal' : 'Urgent',
        type: data.feedback === 'Satisfied' ? 'success' : 'warning',
        targetType: 'all', // Notify faculty
      });

      // Update in Supabase Postgres
      try {
        const updatePayload: Record<string, any> = {
          status: updatedStatus,
          studentFeedback: data.feedback,
          studentFeedbackNote: data.feedbackNote?.trim() || null,
          studentFeedbackAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('SupportTicket')
          .update(updatePayload)
          .or(`id.eq.${data.ticketId},ticketCode.eq.${data.ticketId}`);

        if (error) {
          console.error('Supabase SupportTicket feedback update error:', error.message);
        }
      } catch (err) {
        console.error('Failed to submit student feedback to PostgreSQL:', err);
      }
    },
    [tickets, sendNotification]
  );

  // Metrics - Global (for Admin Console)
  const openTicketsCount = useMemo(() => {
    return tickets.filter((t) => t.status === 'Open').length;
  }, [tickets]);

  const underReviewCount = useMemo(() => {
    return tickets.filter((t) => t.status === 'Under Review' || t.status === 'In Progress').length;
  }, [tickets]);

  const completedCount = useMemo(() => {
    return tickets.filter((t) => t.status === 'Completed' || t.status === 'Resolved').length;
  }, [tickets]);

  // Metrics - Current User / Student Specific
  const myTickets = useMemo(() => {
    if (!user) return [];
    const email = user.email?.toLowerCase().trim();
    const uid = user.id?.toLowerCase().trim();
    const uname = user.name?.toLowerCase().trim();

    return tickets.filter((t) => {
      const tEmail = t.studentEmail?.toLowerCase().trim();
      const tUid = t.userId?.toLowerCase().trim();

      return (
        (email && (tEmail === email || tUid === email)) ||
        (uid && (tUid === uid || tEmail === uid))
      );
    });
  }, [tickets, user]);

  const getUserTickets = useCallback(
    (targetEmail?: string, targetId?: string) => {
      const email = (targetEmail || user?.email)?.toLowerCase().trim();
      const uid = (targetId || user?.id)?.toLowerCase().trim();

      return tickets.filter((t) => {
        const tEmail = t.studentEmail?.toLowerCase().trim();
        const tUid = t.userId?.toLowerCase().trim();

        return (
          (email && (tEmail === email || tUid === email)) ||
          (uid && (tUid === uid || tEmail === uid))
        );
      });
    },
    [tickets, user]
  );

  const myOpenTicketsCount = useMemo(() => {
    return myTickets.filter((t) => t.status === 'Open').length;
  }, [myTickets]);

  const myUnderReviewCount = useMemo(() => {
    return myTickets.filter((t) => t.status === 'Under Review' || t.status === 'In Progress').length;
  }, [myTickets]);

  const myCompletedCount = useMemo(() => {
    return myTickets.filter((t) => t.status === 'Completed' || t.status === 'Resolved').length;
  }, [myTickets]);

  const myTotalTicketsCount = myTickets.length;

  return (
    <SupportTicketContext.Provider
      value={{
        tickets,
        myTickets,
        getUserTickets,
        isLoading,
        openTicketsCount,
        underReviewCount,
        completedCount,
        myOpenTicketsCount,
        myUnderReviewCount,
        myCompletedCount,
        myTotalTicketsCount,
        createTicket,
        respondToTicket,
        submitStudentFeedback,
        refreshTickets: fetchTicketsFromDb,
      }}
    >
      {children}
    </SupportTicketContext.Provider>
  );
};

export const useSupportTickets = () => {
  const context = useContext(SupportTicketContext);
  if (!context) {
    throw new Error('useSupportTickets must be used within a SupportTicketProvider');
  }
  return context;
};
