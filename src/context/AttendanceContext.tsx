'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  SessionItem,
  SessionStatus,
  SessionType,
  SessionAttendance,
  StudentAttendanceRecord,
  AttendanceStatus,
  StudentAttendanceStats,
} from '@/types';
import { calculateAttendanceMetrics } from '@/data/attendanceMockData';
import { useNotifications } from '@/context/NotificationContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { parseDbTimestamp } from '@/lib/dateUtils';

interface CreateLectureParams {
  title: string;
  course: string;
  meetingUrl?: string;
  durationMinutes?: number;
  instructor?: string;
  isLiveNow?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
}

interface AttendanceContextType {
  sessions: SessionItem[];
  activeLiveSession: SessionItem | null;
  attendances: Record<string, SessionAttendance>;
  isLoading: boolean;
  addSession: (sessionData: Omit<SessionItem, 'id'>) => Promise<SessionItem>;
  createLecture: (lectureData: CreateLectureParams) => Promise<SessionItem>;
  updateSessionAttendance: (
    sessionId: string,
    records: Record<string, StudentAttendanceRecord>
  ) => Promise<void>;
  markAllSessionStatus: (sessionId: string, status: AttendanceStatus) => Promise<void>;
  getStudentAttendance: (studentEmail: string) => StudentAttendanceStats;
  getSessionAttendance: (sessionId: string) => SessionAttendance;
  deleteSession: (sessionId: string) => Promise<{ success: boolean; error?: string } | void>;
  overallInstitutionAttendance: number;
  refreshSessions: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

const SESSIONS_STORAGE_KEY = 'aivalytics_sessions_v3';
const ATTENDANCE_STORAGE_KEY = 'aivalytics_attendance_v3';

// Format helper
function formatTimeRange(start: Date, durationMinutes: number): string {
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const startStr = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const endStr = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${startStr} - ${endStr}`;
}

// Convert DB ClassSession row to SessionItem
function mapDbToSession(row: any): SessionItem {
  const startTime = parseDbTimestamp(row.startTime);
  const durationMinutes = row.durationMinutes || 60;
  const expiresAt = row.expiresAt
    ? parseDbTimestamp(row.expiresAt)
    : startTime + durationMinutes * 60000;

  const now = Date.now();
  let status: SessionStatus = 'Closed';

  if (row.status === 'ENDED' || row.status === 'Closed' || row.status === 'CLOSED') {
    status = 'Closed';
  } else if (now < startTime - 60000) {
    status = 'Upcoming';
  } else if (now >= startTime - 60000 && now < expiresAt) {
    status = 'In Progress';
  } else {
    status = 'Closed';
  }

  const startDate = new Date(startTime);
  const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const timeStr = formatTimeRange(startDate, durationMinutes);

  return {
    id: row.id,
    title: row.title,
    course: row.course || 'AI-Native Project Management',
    type: (row.type as SessionType) || 'LIVE',
    status,
    date: dateStr,
    time: timeStr,
    duration: `${durationMinutes} mins`,
    durationMinutes,
    startTime,
    expiresAt,
    instructor: row.instructor || 'Admin Faculty',
    recordingUrl: row.recordingUrl || undefined,
    meetingUrl: row.meetingUrl || 'https://meet.google.com/jye-igap-skb',
  };
}

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sendNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Initial State starts empty on both server and client to guarantee identical initial render tree
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [attendances, setAttendances] = useState<Record<string, SessionAttendance>>({});

  // Hydrate from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
        if (savedSessions) {
          const parsed = JSON.parse(savedSessions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessions(parsed);
          }
        }
        const savedAttendance = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
        if (savedAttendance) {
          setAttendances(JSON.parse(savedAttendance));
        }
      } catch (err) {
        console.error('Failed to load sessions from localStorage', err);
      }
    }
  }, []);

  // Cached learners list for session initialization
  const [dbLearners, setDbLearners] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const dbLearnersRef = useRef(dbLearners);
  dbLearnersRef.current = dbLearners;

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
        localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendances));
      } catch (err) {
        console.error('Failed to save attendance to localStorage', err);
      }
    }
  }, [sessions, attendances]);

  // 2. Fetch Sessions and Attendance Records from Supabase Postgres
  const fetchSessionsFromDb = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch active learners
      const { data: learners } = await supabase
        .from('User')
        .select('id, fullName, email')
        .eq('role', 'LEARNER');

      if (learners) {
        setDbLearners(learners);
      }

      // Fetch Sessions
      const { data: sessionsData, error: sessError } = await supabase
        .from('ClassSession')
        .select('*')
        .order('createdAt', { ascending: false });

      if (sessError) {
        console.warn('Supabase ClassSession fetch notice:', sessError.message);
        return;
      }

      if (sessionsData && sessionsData.length > 0) {
        const dbSessions = sessionsData.map(mapDbToSession);
        setSessions(dbSessions);

        // Fetch Attendance Records
        const { data: recordsData, error: recError } = await supabase
          .from('AttendanceRecord')
          .select(`
            id,
            sessionId,
            userId,
            status,
            attendedAt,
            user:User (
              id,
              fullName,
              email
            )
          `);

        if (!recError && recordsData) {
          // Group records by sessionId
          const grouped: Record<string, SessionAttendance> = {};

          dbSessions.forEach((sess) => {
            const sessRecords: Record<string, StudentAttendanceRecord> = {};

            // Find all DB attendance records for this session
            const matching = recordsData.filter((r: any) => r.sessionId === sess.id);

            matching.forEach((r: any) => {
              const u = r.user;
              if (u && u.email) {
                sessRecords[u.email.toLowerCase()] = {
                  studentId: u.id,
                  studentName: u.fullName || 'Student',
                  studentEmail: u.email,
                  status: (r.status as AttendanceStatus) || 'PRESENT',
                  markedAt: r.attendedAt ? new Date(r.attendedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Saved',
                };
              }
            });

            // Ensure all active learners in cohort are represented without overwriting existing DB statuses
            if (learners && learners.length > 0) {
              learners.forEach((l) => {
                const emailKey = l.email.toLowerCase().trim();
                if (!sessRecords[emailKey]) {
                  sessRecords[emailKey] = {
                    studentId: l.id,
                    studentName: l.fullName,
                    studentEmail: l.email,
                    status: 'PRESENT',
                    markedAt: 'Pending confirmation',
                  };
                }
              });
            }

            const metrics = calculateAttendanceMetrics(sessRecords);

            grouped[sess.id] = {
              sessionId: sess.id,
              sessionTitle: sess.title,
              course: sess.course,
              date: sess.date || 'Today',
              time: sess.time || '10:00 AM',
              lastUpdated: 'Live Database',
              ...metrics,
              records: sessRecords,
            };
          });

          setAttendances(grouped);
        }
      }
    } catch (err) {
      console.error('Failed to load ClassSession & Attendance from DB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 3. Supabase Realtime Subscriptions for sessions and attendance records
  useEffect(() => {
    fetchSessionsFromDb();

    if (!isSupabaseConfigured) return;

    const sessionChannel = supabase
      .channel('realtime:class_sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ClassSession' },
        () => {
          fetchSessionsFromDb();
        }
      )
      .subscribe();

    const attendanceChannel = supabase
      .channel('realtime:attendance_records')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'AttendanceRecord' },
        (payload) => {
          const rec = payload.new as any;
          if (rec && rec.sessionId && rec.userId) {
            setAttendances((prev) => {
              const currentSess = prev[rec.sessionId];
              if (!currentSess) return prev;

              // Find matching learner using live ref to avoid stale closures
              const learner = dbLearnersRef.current.find((l) => l.id === rec.userId);
              const emailKey = learner?.email?.toLowerCase();
              if (!emailKey) return prev;

              const updatedRecords = {
                ...currentSess.records,
                [emailKey]: {
                  ...currentSess.records[emailKey],
                  studentId: rec.userId,
                  status: rec.status as AttendanceStatus,
                  markedAt: 'Just now',
                },
              };

              const metrics = calculateAttendanceMetrics(updatedRecords);

              return {
                ...prev,
                [rec.sessionId]: {
                  ...currentSess,
                  ...metrics,
                  records: updatedRecords,
                  lastUpdated: 'Just now',
                },
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(attendanceChannel);
    };
  }, [fetchSessionsFromDb]);

  // 4. Dynamic Expiration & Status Transition Engine
  useEffect(() => {
    const checkExpirations = () => {
      const now = Date.now();
      let hasChanges = false;

      setSessions((prev) => {
        const updated = prev.map((session) => {
          if (!session.expiresAt) return session;

          const expTime = parseDbTimestamp(session.expiresAt);
          const startTimeNum = session.startTime ? parseDbTimestamp(session.startTime) : null;

          if (now >= expTime && session.status === 'In Progress') {
            hasChanges = true;
            return {
              ...session,
              status: 'Closed' as SessionStatus,
            };
          }

          if (
            startTimeNum !== null &&
            now >= startTimeNum - 60000 &&
            now < expTime &&
            session.status === 'Upcoming'
          ) {
            hasChanges = true;
            return {
              ...session,
              status: 'In Progress' as SessionStatus,
            };
          }

          return session;
        });

        return hasChanges ? updated : prev;
      });
    };

    const interval = setInterval(checkExpirations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Helper to initialize attendance record for a session
  const initAttendanceForSession = useCallback(
    (sessionId: string, sessionTitle: string, course: string, date: string, time: string) => {
      const initialRecords: Record<string, StudentAttendanceRecord> = {};
      
      dbLearners.forEach((student) => {
        initialRecords[student.email.toLowerCase()] = {
          studentId: student.id,
          studentName: student.fullName,
          studentEmail: student.email,
          status: 'PRESENT',
          markedAt: 'Just now',
        };
      });

      const metrics = calculateAttendanceMetrics(initialRecords);

      const newAttendance: SessionAttendance = {
        sessionId,
        sessionTitle,
        course,
        date,
        time,
        lastUpdated: 'Just now',
        ...metrics,
        records: initialRecords,
      };

      setAttendances((prev) => ({
        ...prev,
        [sessionId]: newAttendance,
      }));
    },
    [dbLearners]
  );

  // 5. Create Lecture (Admin Pipeline)
  const createLecture = useCallback(
    async (params: CreateLectureParams): Promise<SessionItem> => {
      const durationMin = params.durationMinutes || 60;
      const isLive = params.isLiveNow !== false;
      const startTime = isLive
        ? Date.now()
        : params.scheduledDate
        ? new Date(params.scheduledDate).getTime()
        : Date.now();
      const expiresAt = startTime + durationMin * 60000;
      const meetingUrl = params.meetingUrl?.trim() || 'https://meet.google.com/jye-igap-skb';
      const instructor = params.instructor || 'Prof. Marcus Vance';
      const startDate = new Date(startTime);
      const dateStr = isLive
        ? 'Today'
        : startDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      const timeStr = formatTimeRange(startDate, durationMin);

      const tempId = `sess_live_${Date.now()}`;
      const newSession: SessionItem = {
        id: tempId,
        title: params.title.trim(),
        course: params.course,
        type: 'LIVE',
        status: isLive ? 'In Progress' : 'Upcoming',
        date: dateStr,
        time: timeStr,
        duration: `${durationMin} mins`,
        durationMinutes: durationMin,
        startTime,
        expiresAt,
        instructor,
        meetingUrl,
      };

      // 1. Add optimistically
      setSessions((prev) => [newSession, ...prev]);
      initAttendanceForSession(tempId, newSession.title, newSession.course, dateStr, timeStr);

      // 2. Broadcast notification
      sendNotification({
        title: isLive ? `🔴 Live Lecture Started: ${newSession.title}` : `📅 New Lecture Scheduled: ${newSession.title}`,
        message: `${instructor} has ${
          isLive ? 'started an interactive live classroom' : 'scheduled a lecture'
        } for ${newSession.course}. Duration: ${durationMin} mins. Click 'Join Live' to enter the Google Meet session.`,
        priority: isLive ? 'Urgent' : 'Important',
        type: 'session',
        targetType: 'all',
        actionUrl: meetingUrl,
      });

      // 3. Persist to DB
      if (isSupabaseConfigured) {
        try {
          const { data: dbRow, error } = await supabase
            .from('ClassSession')
            .insert([
              {
                title: newSession.title,
                course: newSession.course,
                instructor,
                meetingUrl,
                type: 'LIVE',
                status: isLive ? 'In Progress' : 'Upcoming',
                durationMinutes: durationMin,
                startTime: new Date(startTime).toISOString(),
                expiresAt: new Date(expiresAt).toISOString(),
              },
            ])
            .select()
            .single();

          if (!error && dbRow) {
            const persisted = mapDbToSession(dbRow);
            setSessions((prev) => prev.map((s) => (s.id === tempId ? persisted : s)));
            initAttendanceForSession(persisted.id, persisted.title, persisted.course, dateStr, timeStr);
            return persisted;
          }
        } catch (err) {
          console.error('Failed to persist lecture to Supabase:', err);
        }
      }

      return newSession;
    },
    [sendNotification, initAttendanceForSession]
  );

  // Backward-compatible addSession
  const addSession = useCallback(
    async (sessionData: Omit<SessionItem, 'id'>): Promise<SessionItem> => {
      const created = await createLecture({
        title: sessionData.title,
        course: sessionData.course,
        meetingUrl: sessionData.meetingUrl,
        durationMinutes: sessionData.durationMinutes || 60,
        instructor: sessionData.instructor,
        isLiveNow: sessionData.status === 'In Progress',
      });
      return created;
    },
    [createLecture]
  );

  // 6. Update Session Attendance with Database Persistence
  const updateSessionAttendance = useCallback(
    async (sessionId: string, records: Record<string, StudentAttendanceRecord>) => {
      const session = sessions.find((s) => s.id === sessionId);
      const metrics = calculateAttendanceMetrics(records);

      const updated: SessionAttendance = {
        sessionId,
        sessionTitle: session?.title || 'Course Lecture Session',
        course: session?.course || 'General',
        date: session?.date || 'Today',
        time: session?.time || '10:00 AM',
        lastUpdated:
          new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          }) +
          ' • ' +
          new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        ...metrics,
        records,
      };

      // 1. Optimistic update in state immediately
      setAttendances((prev) => ({
        ...prev,
        [sessionId]: updated,
      }));

      // 2. Persist to Supabase AttendanceRecord table
      if (isSupabaseConfigured) {
        try {
          const recordsToUpsert = Object.values(records).map((rec) => {
            const uid =
              rec.studentId ||
              dbLearnersRef.current.find(
                (l) => l.email.toLowerCase() === rec.studentEmail.toLowerCase()
              )?.id;
            return {
              userId: uid,
              sessionId,
              status: rec.status,
              attendedAt: new Date().toISOString(),
            };
          });

          for (const item of recordsToUpsert) {
            if (item.userId) {
              await supabase
                .from('AttendanceRecord')
                .upsert(item, { onConflict: 'userId,sessionId' });
            }
          }
        } catch (err) {
          console.error('Error persisting attendance records to Supabase:', err);
        }
      }
    },
    [sessions]
  );

  // Mark all students in session with a specific status
  const markAllSessionStatus = useCallback(
    async (sessionId: string, status: AttendanceStatus) => {
      const currentAttendance = attendances[sessionId];
      if (!currentAttendance) return;

      const updatedRecords: Record<string, StudentAttendanceRecord> = {};
      Object.entries(currentAttendance.records).forEach(([email, rec]) => {
        updatedRecords[email] = {
          ...rec,
          status,
          markedAt: 'Just now',
        };
      });

      await updateSessionAttendance(sessionId, updatedRecords);
    },
    [attendances, updateSessionAttendance]
  );

  // Get or initialize attendance for a session
  const getSessionAttendance = useCallback(
    (sessionId: string): SessionAttendance => {
      const session = sessions.find((s) => s.id === sessionId);
      const existing = attendances[sessionId];

      const mergedRecords: Record<string, StudentAttendanceRecord> = existing?.records
        ? { ...existing.records }
        : {};

      // Ensure every active learner in cohort is represented while preserving marked status
      dbLearnersRef.current.forEach((student) => {
        const emailKey = student.email.toLowerCase().trim();
        if (!mergedRecords[emailKey]) {
          mergedRecords[emailKey] = {
            studentId: student.id,
            studentName: student.fullName,
            studentEmail: student.email,
            status: 'PRESENT',
            markedAt: 'Pending confirmation',
          };
        }
      });

      const metrics = calculateAttendanceMetrics(mergedRecords);

      return {
        sessionId,
        sessionTitle: session?.title || existing?.sessionTitle || 'Course Lecture Session',
        course: session?.course || existing?.course || 'General',
        date: session?.date || existing?.date || 'Scheduled',
        time: session?.time || existing?.time || '10:00 AM',
        lastUpdated: existing?.lastUpdated || 'Recent',
        ...metrics,
        records: mergedRecords,
      };
    },
    [attendances, sessions]
  );

  // Get student attendance metrics for the student dashboard
  const getStudentAttendance = useCallback(
    (studentEmail: string): StudentAttendanceStats => {
      if (!studentEmail || !studentEmail.trim()) {
        return {
          studentEmail: '',
          totalSessions: 0,
          attendedSessions: 0,
          missedSessions: 0,
          lateSessions: 0,
          percentage: 0,
          sessionDetails: [],
        };
      }

      const emailNorm = studentEmail.toLowerCase().trim();
      const sessionDetails: Array<{
        sessionId: string;
        sessionTitle: string;
        date: string;
        status: AttendanceStatus;
      }> = [];

      let attendedCount = 0;
      let lateCount = 0;
      let absentCount = 0;

      sessions.forEach((s) => {
        const att = attendances[s.id];
        if (att && att.records[emailNorm]) {
          const rec = att.records[emailNorm];
          if (rec.status === 'PRESENT') {
            attendedCount++;
          } else if (rec.status === 'LATE') {
            attendedCount++;
            lateCount++;
          } else {
            absentCount++;
          }

          sessionDetails.push({
            sessionId: s.id,
            sessionTitle: s.title,
            date: s.date || 'Recent',
            status: rec.status,
          });
        }
      });

      const totalSessions = sessionDetails.length;
      const percentage = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0;

      return {
        studentEmail,
        totalSessions,
        attendedSessions: attendedCount,
        missedSessions: absentCount,
        lateSessions: lateCount,
        percentage,
        sessionDetails,
      };
    },
    [sessions, attendances]
  );

  // Current active live session
  const activeLiveSession = useMemo(() => {
    const liveSessions = sessions.filter((s) => s.status === 'In Progress');
    if (liveSessions.length === 0) return null;
    return liveSessions.slice().sort((a, b) => {
      const timeA = parseDbTimestamp(a.startTime);
      const timeB = parseDbTimestamp(b.startTime);
      return timeB - timeA;
    })[0];
  }, [sessions]);

  // Overall institution attendance
  const markedSessions = Object.values(attendances);
  const overallInstitutionAttendance =
    markedSessions.length > 0
      ? Math.round(
          markedSessions.reduce((acc, curr) => acc + curr.attendanceRate, 0) /
            markedSessions.length
        )
      : 88;

  // Delete Session (Admin Action - Permanently deletes from all platform databases and state)
  const deleteSession = useCallback(async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Optimistic removal from active state
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to sync updated sessions to localStorage', e);
        }
      }
      return updated;
    });

    setAttendances((prev) => {
      const copy = { ...prev };
      delete copy[sessionId];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(copy));
        } catch (e) {
          console.error('Failed to sync updated attendances to localStorage', e);
        }
      }
      return copy;
    });

    // 2. Call backend Admin API route (uses Prisma superuser connection & Supabase Admin to bypass RLS)
    try {
      const res = await fetch(`/api/admin/sessions?id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.warn('API delete session response notice:', errorData);
      }
    } catch (apiErr) {
      console.error('Error calling /api/admin/sessions DELETE:', apiErr);
    }

    // 3. Fallback / direct Supabase trigger for Realtime subscribers
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('AttendanceRecord').delete().eq('sessionId', sessionId);
        await supabase.from('ClassSession').delete().eq('id', sessionId);
      } catch (err) {
        console.error('Error executing delete session transaction in Supabase:', err);
      }
    }

    return { success: true };
  }, []);

  return (
    <AttendanceContext.Provider
      value={{
        sessions,
        activeLiveSession,
        attendances,
        isLoading,
        addSession,
        createLecture,
        updateSessionAttendance,
        markAllSessionStatus,
        getStudentAttendance,
        getSessionAttendance,
        deleteSession,
        overallInstitutionAttendance,
        refreshSessions: fetchSessionsFromDb,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
