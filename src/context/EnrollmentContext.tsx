'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ImportedStudent } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface EnrollmentContextType {
  students: ImportedStudent[];
  totalEnrolled: number;
  activeCount: number;
  pendingCount: number;
  isLoading: boolean;
  importStudents: (newStudents: ImportedStudent[]) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  toggleStudentStatus: (id: string) => Promise<void>;
  exportStudentsToCsv: () => void;
  refreshEnrollments: () => Promise<void>;
}

const EnrollmentContext = createContext<EnrollmentContextType | undefined>(undefined);

const ENROLLMENT_STORAGE_KEY = 'aivalytics_enrollment_v2';

export const EnrollmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<ImportedStudent[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(ENROLLMENT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (err) {
        console.error('Failed to load enrolled students from localStorage cache', err);
      }
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync to localStorage as client-side cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ENROLLMENT_STORAGE_KEY, JSON.stringify(students));
      } catch (err) {
        console.error('Failed to persist enrolled students to localStorage', err);
      }
    }
  }, [students]);

  // Fetch from Supabase Postgres
  const fetchEnrollmentsFromDb = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('Enrollment')
        .select(`
          id,
          status,
          enrolledAt,
          progress,
          user:User (
            id,
            fullName,
            email,
            term,
            password
          ),
          course:Course (
            id,
            code,
            title
          )
        `)
        .order('enrolledAt', { ascending: false });

      if (error) {
        console.warn('Supabase Enrollment fetch error:', error.message);
        return;
      }

      if (data && Array.isArray(data)) {
        const formatted: ImportedStudent[] = data
          .filter((row: any) => row.user)
          .map((row: any) => {
            const u = row.user;
            const c = row.course;
            const dateStr = row.enrolledAt
              ? new Date(row.enrolledAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Recent';

            return {
              id: u.id,
              fullName: u.fullName || 'Student',
              email: u.email,
              password: u.password || '••••••••',
              courseCode: c?.code || 'AINPM-101',
              courseName: c?.title || 'AI-Native Project Management',
              term: u.term || 'Fall 2026',
              enrolledAt: dateStr,
              status: row.status === 'Pending' ? 'Pending' : 'Active',
            };
          });

        setStudents(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch enrollments from database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    fetchEnrollmentsFromDb();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('realtime:enrollments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Enrollment' }, () => {
        fetchEnrollmentsFromDb();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEnrollmentsFromDb]);

  // Import students via CSV or manual add
  const importStudents = async (newStudents: ImportedStudent[]) => {
    // 1. Optimistic UI update
    setStudents((prev) => {
      const existingEmails = new Set(prev.map((s) => s.email.toLowerCase()));
      const novel = newStudents.filter((s) => !existingEmails.has(s.email.toLowerCase()));
      return [...novel, ...prev];
    });

    try {
      const { data: authSessionData } = await supabase.auth.getSession();
      const accessToken = authSessionData?.session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const res = await fetch('/api/admin/bulk-import', {
        method: 'POST',
        headers,
        body: JSON.stringify({ students: newStudents }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('Error from /api/admin/bulk-import:', data.error);
      }

      await fetchEnrollmentsFromDb();
    } catch (err) {
      console.error('Error persisting imported students to DB:', err);
      await fetchEnrollmentsFromDb();
    }
  };

  // Delete student enrollment
  const deleteStudent = async (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));

    if (!isSupabaseConfigured) return;

    try {
      await supabase.from('Enrollment').delete().eq('userId', studentId);
    } catch (err) {
      console.error('Error deleting student enrollment from DB:', err);
    }
  };

  // Toggle active/pending status
  const toggleStudentStatus = async (studentId: string) => {
    let nextStatus: 'Active' | 'Pending' = 'Active';

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          nextStatus = s.status === 'Active' ? 'Pending' : 'Active';
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );

    if (!isSupabaseConfigured) return;

    try {
      await supabase
        .from('Enrollment')
        .update({ status: nextStatus })
        .eq('userId', studentId);
    } catch (err) {
      console.error('Error toggling enrollment status in DB:', err);
    }
  };

  // Export to CSV
  const exportStudentsToCsv = () => {
    if (typeof window === 'undefined') return;

    const headers = [
      'Student ID',
      'Full Name',
      'Email',
      'Password',
      'Course Code',
      'Course Name',
      'Term',
      'Status',
      'Enrolled Date',
    ];
    const rows = students.map((s) => [
      `"${s.id}"`,
      `"${s.fullName}"`,
      `"${s.email}"`,
      `"${s.password || '••••••••'}"`,
      `"${s.courseCode}"`,
      `"${s.courseName}"`,
      `"${s.term}"`,
      `"${s.status}"`,
      `"${s.enrolledAt}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `aivalytics_student_enrollment_roster_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalEnrolled = students.length;
  const activeCount = students.filter((s) => s.status === 'Active').length;
  const pendingCount = students.filter((s) => s.status === 'Pending').length;

  return (
    <EnrollmentContext.Provider
      value={{
        students,
        totalEnrolled,
        activeCount,
        pendingCount,
        isLoading,
        importStudents,
        deleteStudent,
        toggleStudentStatus,
        exportStudentsToCsv,
        refreshEnrollments: fetchEnrollmentsFromDb,
      }}
    >
      {children}
    </EnrollmentContext.Provider>
  );
};

export const useEnrollment = () => {
  const context = useContext(EnrollmentContext);
  if (!context) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider');
  }
  return context;
};
