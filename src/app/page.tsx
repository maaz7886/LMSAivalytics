'use client';

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { StudentAttendanceStackCard } from '@/components/dashboard/StudentAttendanceStackCard';
import { MiniStatCard } from '@/components/dashboard/MiniStatCard';
import { WeeklyActivityChart } from '@/components/dashboard/WeeklyActivityChart';
import { RecentSessionsTable } from '@/components/dashboard/RecentSessionsTable';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import {
  mockMetricCards,
  mockWeeklyActivity,
  mockRecentSessions,
} from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { useAttendance } from '@/context/AttendanceContext';
import { useCourses } from '@/context/CourseContext';
import { useSupportTickets } from '@/context/SupportTicketContext';
import { parseDbTimestamp } from '@/lib/dateUtils';
import Link from 'next/link';
import { Calendar, ChevronDown, FileCheck, ArrowRight, Video, Clock, User, ExternalLink } from 'lucide-react';

export default function DashboardPage() {
  const { user, role, isLoading } = useAuth();
  const { getStudentAttendance, sessions, activeLiveSession } = useAttendance();
  const {
    courses,
    activeCourse,
    courseProgress,
    completedLessonsCount,
    modules,
    isLessonCompleted,
  } = useCourses();
  const {
    myTotalTicketsCount,
    myCompletedCount,
    myOpenTicketsCount,
    myUnderReviewCount,
  } = useSupportTickets();

  const [selectedRange, setSelectedRange] = useState('Aug 1 - Aug 31, 2026');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateRanges = [
    'Aug 1 - Aug 31, 2026',
    'Jul 1 - Jul 31, 2026',
    'Jun 1 - Jun 30, 2026',
    'Year-to-date (2026)',
  ];

  const firstName = user?.name ? user.name.split(' ')[0] : 'Learner';
  const isAdmin = role === 'admin' || user?.role === 'admin';

  // Dynamic live attendance calculation for the student
  const studentEmail = user?.email || '';
  const studentAttendance = getStudentAttendance(studentEmail);

  // Dynamic user support ticket statistics
  const userActiveTickets = myOpenTicketsCount + myUnderReviewCount;
  const userTicketsResolvedPercentage =
    myTotalTicketsCount > 0
      ? Math.round((myCompletedCount / myTotalTicketsCount) * 100)
      : 0;

  // Real-time completed module certifications
  const completedModulesCount = useMemo(() => {
    return modules.filter(
      (m) => m.submodules.length > 0 && m.submodules.every((s) => isLessonCompleted(s.id))
    ).length;
  }, [modules, isLessonCompleted]);
  const totalModulesCount = modules.length || 3;
  const certPercentage = Math.round((completedModulesCount / totalModulesCount) * 100);

  // Fully dynamic metrics calculated from live user data
  const dynamicMetricCards = useMemo(() => {
    const upcomingCount = sessions.filter((s) => s.status === 'Upcoming').length;
    const liveNowCount = activeLiveSession ? 1 : 0;
    const totalActiveSessions = upcomingCount + liveNowCount;

    return [
      {
        id: 'courses_enrolled',
        title: 'Courses enrolled',
        value: 1,
        changeText: '1 Program enrolled',
        changeType: 'positive' as const,
        icon: 'book' as const,
      },
      {
        id: 'sessions_completed',
        title: 'Sessions completed',
        value: studentAttendance.attendedSessions,
        changeText:
          studentAttendance.attendedSessions === 0
            ? '0 sessions attended'
            : `${studentAttendance.attendedSessions} of ${studentAttendance.totalSessions} sessions attended`,
        changeType: studentAttendance.attendedSessions > 0 ? ('positive' as const) : ('neutral' as const),
        icon: 'check-circle' as const,
      },
      {
        id: 'live_sessions',
        title: 'Live sessions',
        value: totalActiveSessions,
        changeText:
          activeLiveSession
            ? '● Live session in progress'
            : totalActiveSessions === 0
            ? '0 upcoming sessions'
            : `${totalActiveSessions} upcoming session${totalActiveSessions === 1 ? '' : 's'}`,
        changeType: activeLiveSession ? ('positive' as const) : ('neutral' as const),
        icon: 'video' as const,
      },
      {
        id: 'support_tickets',
        title: 'Support tickets',
        value: myTotalTicketsCount,
        changeText:
          myTotalTicketsCount === 0
            ? '0 tickets filed'
            : myCompletedCount > 0
            ? `✓ ${myCompletedCount} resolved • ${userActiveTickets} open`
            : userActiveTickets > 0
            ? `⏱ ${userActiveTickets} open`
            : 'All resolved',
        changeType: userActiveTickets > 0 ? ('alert' as const) : ('positive' as const),
        icon: 'ticket' as const,
      },
    ];
  }, [
    studentAttendance.attendedSessions,
    studentAttendance.totalSessions,
    sessions,
    activeLiveSession,
    myTotalTicketsCount,
    myCompletedCount,
    userActiveTickets,
  ]);

  // Dynamic weekly activity hours
  const dynamicWeeklyActivity = useMemo(() => {
    if (completedLessonsCount === 0) {
      return [
        { week: 'W1', hours: 0 },
        { week: 'W2', hours: 0 },
        { week: 'W3', hours: 0 },
        { week: 'W4', hours: 0 },
        { week: 'W5', hours: 0 },
        { week: 'W6', hours: 0 },
        { week: 'W7', hours: 0 },
        { week: 'W8', hours: 0 },
      ];
    }
    const baseHours = Math.round(completedLessonsCount * 0.8 * 10) / 10;
    return [
      { week: 'W1', hours: Math.min(baseHours, 2.5) },
      { week: 'W2', hours: Math.min(Math.max(0, baseHours - 2.5), 3.0) },
      { week: 'W3', hours: Math.min(Math.max(0, baseHours - 5.5), 4.0) },
      { week: 'W4', hours: 0 },
      { week: 'W5', hours: 0 },
      { week: 'W6', hours: 0 },
      { week: 'W7', hours: 0 },
      { week: 'W8', hours: 0 },
    ];
  }, [completedLessonsCount]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#3ECE92] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-gray-400">Loading AIvalytics workspace...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
          {/* Welcome Greeting & Date Range Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111614]">
                Good to see you, {firstName}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Here&apos;s how your learning is tracking this month.
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="relative self-start sm:self-center">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium text-gray-600 bg-white border border-[#eaedf0] hover:bg-gray-50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>{selectedRange}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {showDatePicker && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-30 animate-in fade-in duration-100">
                  {dateRanges.map((range) => (
                    <button
                      key={range}
                      onClick={() => {
                        setSelectedRange(range);
                        setShowDatePicker(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg font-mono transition-colors ${
                        selectedRange === range
                          ? 'bg-[#e8f8f0] text-[#059669] font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Live Classroom Happening Now Banner */}
          {activeLiveSession && (
            <div
              id="live-lecture-dashboard-card"
              className="bg-gradient-to-r from-[#121614] via-[#1a231f] to-[#121614] text-white rounded-3xl p-6 sm:p-7 border-2 border-[#3ECE92]/40 shadow-xl shadow-[#3ECE92]/10 relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#3ECE92]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#3ECE92] text-[#111614] shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[#111614] animate-ping" />
                      <span>LIVE CLASSROOM IN SESSION</span>
                    </span>
                    <span className="text-xs font-mono text-gray-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                      {activeLiveSession.course}
                    </span>
                    {activeLiveSession.expiresAt && (
                      <span
                        suppressHydrationWarning
                        className="text-xs font-mono text-[#3ECE92] font-semibold bg-[#3ECE92]/10 px-2.5 py-0.5 rounded-full"
                      >
                        Ends in {Math.max(1, Math.round((parseDbTimestamp(activeLiveSession.expiresAt) - Date.now()) / 60000))}m
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {activeLiveSession.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
                    Faculty {activeLiveSession.instructor || 'Instructor'} is hosting this interactive classroom on Google Meet. Click Join Live to enter the live session.
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-400 font-mono pt-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#3ECE92]" />
                      {activeLiveSession.time} ({activeLiveSession.duration || '60 mins'})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#3ECE92]" />
                      {activeLiveSession.instructor || 'Prof. Marcus Vance'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      const meetUrl = activeLiveSession.meetingUrl || 'https://meet.google.com/jye-igap-skb';
                      window.open(meetUrl, '_blank', 'noopener,noreferrer');
                    }}
                    id="student-dashboard-join-live-btn"
                    className="bg-[#3ECE92] hover:bg-[#34be83] text-[#111614] font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm transition-all duration-200 flex items-center gap-2.5 shadow-lg shadow-[#3ECE92]/25 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Video className="w-4 h-4 fill-current" />
                    <span>Join Live Google Meet</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Assessments & Project Submissions Callout Banner for Learners */}
          <div className="bg-linear-to-r from-[#121614] to-[#1c221f] text-white rounded-2xl p-5 border border-gray-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#3ECE92]/20 border border-[#3ECE92]/30 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5 text-[#3ECE92]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#3ECE92] text-[#111614] px-2 py-0.5 rounded-full">
                    Assessments & Projects
                  </span>
                  <span className="text-xs text-gray-400 font-mono">• AI-Native Program</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1">
                  Guided Project Deliverables & Milestone Quizzes
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Submit module deliverables (PDF, PPT, DOC, images, demo links) for faculty review and complete timed quizzes.
                </p>
              </div>
            </div>

            <Link
              href="/assessments"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#111614] bg-[#3ECE92] hover:bg-[#34b780] shadow-sm transition-all active:scale-95 shrink-0 self-start sm:self-center"
            >
              <span>View Assessments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 1. Metric Cards Grid (4 in a row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {dynamicMetricCards.map((card) => (
              <MetricCard
                key={card.id}
                data={card}
                href={card.id === 'support_tickets' ? '/support' : undefined}
              />
            ))}
          </div>

          {/* 2. Stack-based Attendance & Academic Progress Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
            {/* Student Lecture Attendance & Reflection Stack Card (Span 2 cols on lg) */}
            <div className="lg:col-span-2">
              <StudentAttendanceStackCard
                sessions={sessions}
                studentEmail={studentEmail}
              />
            </div>

            {/* Academic Milestone & Progress Stat Cards Column (Span 1 col on lg) */}
            <div className="flex flex-col gap-2.5 sm:gap-2.5">
              {/* 1. Certificate issued */}
              <MiniStatCard
                title="Certificates issued"
                subtitle={
                  completedModulesCount === 0
                    ? '0 of 3 certifications earned'
                    : `${completedModulesCount} of 3 certifications earned`
                }
                percentage={certPercentage}
                icon="award"
                href="/profile"
              />

              {/* 2. Course completion (In between) */}
              <MiniStatCard
                title="Course completion"
                subtitle={
                  courseProgress === 0
                    ? '0% completed • 100% remaining'
                    : `${courseProgress}% completed • ${100 - courseProgress}% remaining`
                }
                percentage={courseProgress}
                icon="book"
                href="/courses"
              />

              {/* 3. Live attendance (In between) */}
              <MiniStatCard
                title="Live attendance"
                subtitle={
                  studentAttendance.totalSessions === 0
                    ? '0 sessions recorded'
                    : `${studentAttendance.attendedSessions} of ${studentAttendance.totalSessions} sessions attended`
                }
                percentage={studentAttendance.percentage}
                icon="video"
                href="/attendance"
              />

              {/* 4. Ticket resolve */}
              <MiniStatCard
                title="Tickets resolved"
                subtitle={
                  myTotalTicketsCount === 0
                    ? '0 of 0 closed • 0 open'
                    : `${myCompletedCount} of ${myTotalTicketsCount} closed • ${userActiveTickets} open`
                }
                percentage={userTicketsResolvedPercentage}
                icon="ticket"
                href="/support"
              />
            </div>
          </div>

          {/* 4. Weekly Learning Activity Chart */}
          <div>
            <WeeklyActivityChart data={dynamicWeeklyActivity} />
          </div>

          {/* 5. Recent Sessions Table */}
          <div>
            <RecentSessionsTable sessions={sessions} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
