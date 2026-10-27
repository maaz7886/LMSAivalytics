'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useAttendance } from '@/context/AttendanceContext';
import { AdminAttendanceModal } from '@/components/admin/AdminAttendanceModal';
import { SessionItem, AttendanceStatus } from '@/types';
import { useEnrollment } from '@/context/EnrollmentContext';
import {
  UserCheck,
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Plus,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Award,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  X,
  Eye,
  Trash2,
} from 'lucide-react';

export default function AttendancePage() {
  const { user, role } = useAuth();
  const { students: enrolledStudents } = useEnrollment();
  const {
    sessions,
    attendances,
    addSession,
    createLecture,
    deleteSession,
    getSessionAttendance,
    getStudentAttendance,
    overallInstitutionAttendance,
  } = useAttendance();

  const cohortStudents = React.useMemo(() => {
    return enrolledStudents.map((s) => ({
      studentId: s.id,
      studentName: s.fullName,
      studentEmail: s.email,
    }));
  }, [enrolledStudents]);

  const isAdmin = role === 'admin' || user?.role === 'admin';
  const router = useRouter();

  // Guard: Redirect non-admins to Dashboard
  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/');
    }
  }, [user, isAdmin, router]);

  // Navigation sub-tab: 'sessions' | 'students'
  const [activeTab, setActiveTab] = useState<'sessions' | 'students'>('sessions');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [selectedAttendanceSession, setSelectedAttendanceSession] =
    useState<SessionItem | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Delete Session state
  const [sessionToDelete, setSessionToDelete] = useState<SessionItem | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      setIsDeletingSession(true);
      await deleteSession(sessionToDelete.id);
      showToast(`Session "${sessionToDelete.title}" deleted from all platform rosters.`);
      if (selectedAttendanceSession?.id === sessionToDelete.id) {
        setSelectedAttendanceSession(null);
      }
      setSessionToDelete(null);
    } catch (err) {
      console.error('Error deleting session:', err);
      showToast('Failed to delete session. Please try again.');
    } finally {
      setIsDeletingSession(false);
    }
  };

  // Handle redirection from Dashboard (?action=schedule or ?session=sess_1)
  const initialUrlHandled = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || initialUrlHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const sessionId = params.get('session');

    if (action === 'schedule') {
      setIsScheduleModalOpen(true);
      initialUrlHandled.current = true;
      window.history.replaceState({}, '', '/attendance');
    } else if (sessionId && sessions.length > 0) {
      const foundSession = sessions.find((s) => s.id === sessionId);
      if (foundSession) {
        setSelectedAttendanceSession(foundSession);
        setActiveTab('sessions');
        initialUrlHandled.current = true;
        window.history.replaceState({}, '', '/attendance');
      }
    }
  }, [sessions]);

  // New Event Schedule Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCourse, setNewCourse] = useState('AI-Native Project Management');
  const [newType, setNewType] = useState<'LIVE' | 'RECORDING'>('LIVE');
  const [newDate, setNewDate] = useState('Today');
  const [newTime, setNewTime] = useState('11:00 AM - 12:30 PM');
  const [newInstructor, setNewInstructor] = useState('Admin Faculty');
  const [newMeetingUrl, setNewMeetingUrl] = useState('https://meet.google.com/jye-igap-skb');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newSession = await createLecture({
      title: newTitle.trim(),
      course: newCourse,
      instructor: newInstructor,
      meetingUrl: newMeetingUrl || 'https://meet.google.com/jye-igap-skb',
      isLiveNow: newDate === 'Today' || newDate.toLowerCase().includes('now'),
      durationMinutes: 90,
    });

    setNewTitle('');
    setIsScheduleModalOpen(false);
    showToast(`Lecture "${newSession.title}" launched & broadcasted to students!`);
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.course.toLowerCase().includes(search.toLowerCase()) ||
      (s.instructor && s.instructor.toLowerCase().includes(search.toLowerCase()));

    const matchesCourse = courseFilter === 'All' || s.course.includes(courseFilter);
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Live' && s.status === 'In Progress') ||
      (statusFilter === 'Upcoming' && s.status === 'Upcoming') ||
      (statusFilter === 'Closed' && s.status === 'Closed');

    return matchesSearch && matchesCourse && matchesStatus;
  });

  // Filtered Students
  const filteredStudents = cohortStudents.filter((std) => {
    return (
      std.studentName.toLowerCase().includes(search.toLowerCase()) ||
      std.studentEmail.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Calculate institution summary stats
  const totalSessionsCount = sessions.length;
  const totalEnrolledCount = cohortStudents.length;
  const markedSessionsCount = Object.values(attendances).length;

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center p-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 border border-amber-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Attendance rosters and cohort tracking are restricted to authorized administrators. Redirecting...
          </p>
          <Link
            href="/"
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#121614] hover:bg-black transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-14">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#121614] text-white px-4 py-3 rounded-2xl shadow-2xl border border-gray-800 flex items-center gap-3 animate-in slide-in-from-bottom-5">
            <div className="w-6 h-6 rounded-full bg-[#3ECE92]/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#3ECE92]" />
            </div>
            <span className="text-xs font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#eaedf0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#e8f8f0] text-[#059669] border border-[#d1f4e2]">
                <UserCheck className="w-3.5 h-3.5" />
                Live Lecture Attendance System
              </span>
              <span className="text-xs text-gray-400 font-mono">• AI-Native Program</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111614]">
              {isAdmin ? 'Session Attendance & Cohort Rosters' : 'My Live Lecture Attendance'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
              {isAdmin
                ? 'Track student participation rates across live lectures, update session rosters with single-click actions, and review cohort streaks.'
                : 'Review your live lecture attendance record, verified seminars, and cohort milestone progress.'}
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#111614] bg-[#3ECE92] hover:bg-[#34b780] shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule New Session</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 KPI Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* 1. Overall Attendance */}
          <div className="bg-white rounded-2xl p-5 border border-[#eaedf0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Institution Attendance</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {overallInstitutionAttendance}%
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Cohort Target: 80%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-[#3ECE92] h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallInstitutionAttendance}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. Total Sessions Tracked */}
          <div className="bg-white rounded-2xl p-5 border border-[#eaedf0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Lecture Sessions</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {totalSessionsCount}
                </span>
                <span className="text-xs text-gray-400 font-mono">Sessions</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {markedSessionsCount} rosters completed & verified
              </p>
            </div>
          </div>

          {/* 3. Enrolled Cohort Students */}
          <div className="bg-white rounded-2xl p-5 border border-[#eaedf0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Active Cohort</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {totalEnrolledCount}
                </span>
                <span className="text-xs text-gray-400 font-mono">Enrolled</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">AI-Native PM Flagship Cohort</p>
            </div>
          </div>

          {/* 4. Average Attendance Count */}
          <div className="bg-white rounded-2xl p-5 border border-[#eaedf0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Attendance Reliability</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {((overallInstitutionAttendance / 100) * totalEnrolledCount).toFixed(1)}
                </span>
                <span className="text-xs text-gray-400 font-mono">/ {totalEnrolledCount} Avg.</span>
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                High learner engagement rate
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-[#eaedf0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Segmented Tabs */}
          <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200/60 self-start md:self-center">
            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sessions'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Session Rosters ({filteredSessions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Student Cohort ({filteredStudents.length})</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTab === 'sessions' ? 'Search sessions, instructors...' : 'Search student names...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#3ECE92] bg-[#fafbfb]"
              />
            </div>

            {activeTab === 'sessions' && (
              <>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-gray-200 bg-[#fafbfb] text-gray-700 font-medium focus:outline-none focus:border-[#3ECE92]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Live">Live Now</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Closed">Closed</option>
                </select>

                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-gray-200 bg-[#fafbfb] text-gray-700 font-medium focus:outline-none focus:border-[#3ECE92]"
                >
                  <option value="All">All Modules</option>
                  <option value="AI-Native Project Management">AI-Native Project Management (AINPM-101)</option>
                  <option value="Module 1">Module 1: AI Foundations</option>
                  <option value="Module 2">Module 2: AI Agents & Orchestration</option>
                  <option value="Module 3">Module 3: AI-Native Project Management</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* TAB 1: Session Rosters View */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            {filteredSessions.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#eaedf0]">
                <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-900">No lecture sessions found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search criteria or schedule a new lecture session.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {filteredSessions.map((session) => {
                  const isLive = session.status === 'In Progress';
                  const attendance = getSessionAttendance(session.id);
                  const hasAttendance = attendance && attendance.totalEnrolled > 0;

                  return (
                    <div
                      key={session.id}
                      className="bg-white rounded-2xl border border-[#eaedf0] shadow-xs hover:border-[#3ECE92]/40 transition-all p-5 flex flex-col justify-between gap-4 group"
                    >
                      <div>
                        {/* Top Tags */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="text-[11px] font-semibold text-[#059669] bg-[#e8f8f0] px-2.5 py-0.5 rounded-md">
                            {session.course}
                          </span>

                          <div className="flex items-center gap-2">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#5ae4a8] text-[#111614]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#111614] animate-ping" />
                                <span>Live Now</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                {session.status}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Timing */}
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-950 transition-colors">
                          {session.title}
                        </h3>

                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2 font-mono">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {session.date} • {session.time}
                          </span>
                        </div>

                        {session.instructor && (
                          <p className="text-xs text-gray-500 mt-1 font-medium">
                            Instructor: <span className="text-gray-700">{session.instructor}</span>
                          </p>
                        )}

                        {/* Attendance Progress Box */}
                        <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-[#3ECE92]" />
                              Cohort Attendance
                            </span>
                            <span className="font-mono font-bold text-emerald-700">
                              {attendance.presentCount + attendance.lateCount} / {attendance.totalEnrolled} Present ({attendance.attendanceRate}%)
                            </span>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex">
                            <div
                              className="bg-[#3ECE92] h-full transition-all"
                              style={{
                                width: `${attendance.totalEnrolled > 0 ? ((attendance.presentCount + attendance.lateCount) / attendance.totalEnrolled) * 100 : 0}%`,
                              }}
                            />
                            <div
                              className="bg-rose-400 h-full transition-all"
                              style={{
                                width: `${attendance.totalEnrolled > 0 ? (attendance.absentCount / attendance.totalEnrolled) * 100 : 0}%`,
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5 font-mono">
                            <span>{attendance.presentCount} Present • {attendance.lateCount} Late • {attendance.absentCount} Absent</span>
                            <span>Updated: {attendance.lastUpdated || 'Initial'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedAttendanceSession(session)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#111614] bg-[#3ECE92] hover:bg-[#34b780] shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>{hasAttendance ? 'Update Attendance Roster' : 'Mark Attendance'}</span>
                        </button>

                        {session.meetingUrl && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-gray-200"
                            title="Open Virtual Lecture Room"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setSessionToDelete(session)}
                            className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors border border-rose-200 hover:border-rose-300 shrink-0 cursor-pointer"
                            title="Delete Session from all platform areas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Student Cohort View */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-3xl border border-[#eaedf0] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Enrolled Cohort Attendance Records</h3>
                <p className="text-xs text-gray-400">
                  Individual student attendance rates and participation streaks
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {cohortStudents.length} Active Learners
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-[#fafbfb] text-gray-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3.5 px-6">Student</th>
                    <th className="py-3.5 px-6">Email Address</th>
                    <th className="py-3.5 px-6">Attended Sessions</th>
                    <th className="py-3.5 px-6">Missed Sessions</th>
                    <th className="py-3.5 px-6">Attendance Rate</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((std) => {
                    const stats = getStudentAttendance(std.studentEmail);
                    const initials = std.studentName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2);

                    const isGood = stats.percentage >= 80;
                    const isModerate = stats.percentage >= 60 && stats.percentage < 80;

                    return (
                      <tr key={std.studentEmail} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#e8f8f0] text-[#059669] font-bold flex items-center justify-center border border-[#d1f4e2]/60">
                              {initials}
                            </div>
                            <span className="font-bold text-gray-900 text-xs sm:text-sm">
                              {std.studentName}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-mono text-gray-600 text-xs">
                          {std.studentEmail}
                        </td>

                        <td className="py-4 px-6">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-mono">
                            {stats.attendedSessions} of {stats.totalSessions}
                          </span>
                        </td>

                        <td className="py-4 px-6 font-mono text-gray-600">
                          {stats.missedSessions} missed
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                                isGood
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isModerate
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {stats.percentage}%
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForHistory(std.studentEmail)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                            <span>View Breakdown</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Schedule Event Modal */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#e8f8f0] flex items-center justify-center border border-[#d1f4e2]">
                    <Calendar className="w-4 h-4 text-[#3ECE92]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Schedule Lecture Session</h3>
                    <p className="text-[11px] text-gray-400">Creates lecture & initializes attendance roster</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Session Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Session 3: Neural Vector Embeddings & Similarity"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#3ECE92]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Course Cohort
                  </label>
                  <select
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#3ECE92] bg-white text-gray-800"
                  >
                    <option value="AI-Native Project Management">AI-Native Project Management (Flagship)</option>
                    <option value="Module 1: AI Foundations">Module 1: AI Foundations</option>
                    <option value="Module 2: AI Agents & Orchestration">Module 2: AI Agents & Orchestration</option>
                    <option value="Module 3: AI-Native Project Management">Module 3: AI-Native Project Management</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                    <input
                      type="text"
                      required
                      placeholder="Oct 20, 2026"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#3ECE92]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Time</label>
                    <input
                      type="text"
                      required
                      placeholder="11:00 AM - 12:30 PM"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#3ECE92]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Virtual Meeting Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.aivalytics.com/session-..."
                    value={newMeetingUrl}
                    onChange={(e) => setNewMeetingUrl(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#3ECE92]"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#3ECE92] hover:bg-[#34be83] text-[#111614] font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Confirm & Publish
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Student History Breakdown Modal */}
        {selectedStudentForHistory && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
              {(() => {
                const std = cohortStudents.find(
                  (s) => s.studentEmail === selectedStudentForHistory
                );
                const stats = getStudentAttendance(selectedStudentForHistory);

                return (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          {std?.studentName || 'Student'} - Attendance Breakdown
                        </h3>
                        <p className="text-xs text-gray-400 font-mono">{selectedStudentForHistory}</p>
                      </div>
                      <button
                        onClick={() => setSelectedStudentForHistory(null)}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="my-4 p-4 rounded-2xl bg-[#f8faf9] border border-gray-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-500">Overall Attendance</span>
                        <p className="text-xl font-extrabold text-gray-900 mt-0.5">
                          {stats.percentage}%
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-emerald-700 font-bold">{stats.attendedSessions} Attended</span>
                        <span className="text-gray-400 mx-1.5">•</span>
                        <span className="text-rose-700 font-bold">{stats.missedSessions} Missed</span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-2xl">
                      {stats.sessionDetails.map((s, idx) => (
                        <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-gray-900">{s.sessionTitle}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{s.date}</p>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                              s.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.status === 'LATE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 mt-3 border-t border-gray-100 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForHistory(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Admin Attendance Marker Modal */}
        <AdminAttendanceModal
          isOpen={!!selectedAttendanceSession}
          onClose={() => setSelectedAttendanceSession(null)}
          session={selectedAttendanceSession}
          onSuccess={(msg) => showToast(msg)}
          onDelete={(sess) => {
            setSelectedAttendanceSession(null);
            setSessionToDelete(sess);
          }}
        />

        {/* Delete Session Confirmation Modal */}
        {sessionToDelete && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100 shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Delete Lecture Session</h3>
                  <p className="text-[11px] text-gray-400">Permanently removes session from all platform areas</p>
                </div>
              </div>

              <div className="my-4 p-4 rounded-2xl bg-rose-50/60 border border-rose-100">
                <p className="text-xs font-semibold text-gray-900">
                  {sessionToDelete.title}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1 font-mono">
                  <span>{sessionToDelete.course}</span>
                  <span>•</span>
                  <span>{sessionToDelete.date}</span>
                </div>
                <p className="text-[11px] text-rose-700 mt-2 font-medium">
                  ⚠️ This action cannot be undone. All associated attendance records and rosters will also be deleted from the database.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeletingSession}
                  onClick={() => setSessionToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingSession}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingSession ? 'Deleting...' : 'Delete Permanently'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
