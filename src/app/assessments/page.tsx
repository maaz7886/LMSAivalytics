'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useTests } from '@/context/TestContext';
import { useProjectSubmissions } from '@/context/ProjectSubmissionsContext';
import { ProjectSubmissionsLearnerView } from '@/components/assessments/ProjectSubmissionsLearnerView';
import { ProjectSubmissionsAdminView } from '@/components/assessments/ProjectSubmissionsAdminView';
import { AdminQuizStatsCard } from '@/components/admin/AdminQuizStatsCard';
import { CsvQuizUploadModal } from '@/components/admin/CsvQuizUploadModal';
import { TestTakingModal } from '@/components/quiz/TestTakingModal';
import { Quiz } from '@/types';
import {
  FolderKanban,
  FileCheck,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Plus,
  Search,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function AssessmentsPage() {
  const { user, role } = useAuth();
  const { quizzes, attempts } = useTests();
  const { stats: projectStats } = useProjectSubmissions();

  const isAdmin = role === 'admin' || user?.role === 'admin';

  // Sub-tab state: 'projects' | 'quizzes'
  const [activeSection, setActiveSection] = useState<'projects' | 'quizzes'>('projects');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'quizzes') {
        setActiveSection('quizzes');
      }
    }
  }, []);

  // Quizzes interaction state
  const [selectedQuizForTest, setSelectedQuizForTest] = useState<Quiz | null>(null);
  const [isCsvQuizModalOpen, setIsCsvQuizModalOpen] = useState(false);
  const [quizFilter, setQuizFilter] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [quizSearch, setQuizSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const studentEmail = user?.email || '';
  const myQuizAttempts = studentEmail
    ? attempts.filter(
        (a) => a.studentEmail && a.studentEmail.toLowerCase() === studentEmail.toLowerCase()
      )
    : [];

  const isQuizCompletedByMe = (quizId: string) => {
    return myQuizAttempts.some((a) => a.quizId === quizId);
  };

  const getMyLatestQuizAttempt = (quizId: string) => {
    return myQuizAttempts.find((a) => a.quizId === quizId);
  };

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      quiz.title.toLowerCase().includes(quizSearch.toLowerCase()) ||
      quiz.courseCode.toLowerCase().includes(quizSearch.toLowerCase());

    const completed = isQuizCompletedByMe(quiz.id);
    if (quizFilter === 'Pending') return matchesSearch && !completed;
    if (quizFilter === 'Completed') return matchesSearch && completed;
    return matchesSearch;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Toast Feedback */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-brand-dark text-white px-4 py-3 rounded-xl shadow-2xl border border-gray-800 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 motion-reduce:animate-none">
            <div className="w-6 h-6 rounded-full bg-brand-mint/15 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-brand-mint" />
            </div>
            <span className="text-xs font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Unified Assessment Section Header */}
        <div className="bg-white rounded-2xl p-6 border border-border-subtle shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-mint-light text-brand-mint-text border border-brand-mint/20">
                <FileCheck className="w-3.5 h-3.5" />
                Assessment Hub: AI-Native Project Management
              </span>
              <span className="text-xs text-gray-500 font-mono">3 Professional Certifications</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-dark">
              {isAdmin ? 'Assessment & Project Review Desk' : 'Assessments & Guided Project Submissions'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {isAdmin
                ? 'Manage module subparts, set deadlines, inspect student deliverable files, and grade submissions with faculty remarks.'
                : 'Submit your guided project deliverables (PDF, DOC, PPT, Images, Links) across 3 modules and attend timed milestone quizzes.'}
            </p>
          </div>

          {/* Section Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-2xl self-start md:self-center shrink-0 border border-gray-200/50">
            <button
              onClick={() => setActiveSection('projects')}
              id="tab-guided-projects"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeSection === 'projects'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FolderKanban className="w-4 h-4 text-brand-mint" />
              <span>Project Deliverables</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-brand-mint-light text-brand-mint-text">
                {projectStats.totalSubparts} Parts
              </span>
            </button>

            <button
              onClick={() => setActiveSection('quizzes')}
              id="tab-milestone-quizzes"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeSection === 'quizzes'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileCheck className="w-4 h-4 text-brand-mint" />
              <span>Milestone Quizzes</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-gray-200 text-gray-700">
                {quizzes.length} Tests
              </span>
            </button>
          </div>
        </div>

        {/* ================= VIEW 1: GUIDED PROJECT SUBMISSIONS ================= */}
        {activeSection === 'projects' && (
          <div>
            {isAdmin ? (
              <ProjectSubmissionsAdminView />
            ) : (
              <ProjectSubmissionsLearnerView />
            )}
          </div>
        )}

        {/* ================= VIEW 2: TIMED MILESTONE QUIZZES ================= */}
        {activeSection === 'quizzes' && (
          <div>
            {isAdmin ? (
              <div className="space-y-6">
                <AdminQuizStatsCard
                  onOpenCreateModal={() => setIsCsvQuizModalOpen(true)}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Learner Quizzes Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-white border border-[#eaedf0] shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#3ECE92]">
                      <Award className="w-6 h-6 text-[#3ECE92]" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Completed Quizzes</div>
                      <div className="text-xl font-bold font-mono text-gray-900 mt-0.5">
                        {myQuizAttempts.length} of {quizzes.length}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-[#eaedf0] shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#3ECE92]">
                      <CheckCircle2 className="w-6 h-6 text-[#3ECE92]" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Average Grade</div>
                      <div className="text-xl font-bold font-mono text-gray-900 mt-0.5">
                        {myQuizAttempts.length > 0
                          ? `${Math.round(
                              myQuizAttempts.reduce((sum, a) => sum + a.score, 0) /
                                myQuizAttempts.length
                            )}%`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-[#eaedf0] shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Pending Assessments</div>
                      <div className="text-xl font-bold font-mono text-gray-900 mt-0.5">
                        {Math.max(0, quizzes.length - myQuizAttempts.length)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 p-1 bg-white border border-gray-200 rounded-xl self-start">
                    {(['All', 'Pending', 'Completed'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setQuizFilter(tab)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          quizFilter === tab
                            ? 'bg-[#121614] text-white shadow-xs'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search quizzes..."
                      value={quizSearch}
                      onChange={(e) => setQuizSearch(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-[#3ECE92] focus:ring-1 focus:ring-[#3ECE92] outline-none"
                    />
                  </div>
                </div>

                {/* Quizzes List Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredQuizzes.length === 0 ? (
                    <div className="col-span-2 bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400 text-xs">
                      No quizzes found matching this filter.
                    </div>
                  ) : (
                    filteredQuizzes.map((quiz) => {
                      const latestAttempt = getMyLatestQuizAttempt(quiz.id);
                      const isCompleted = !!latestAttempt;

                      return (
                        <div
                          key={quiz.id}
                          className="bg-white rounded-2xl p-6 border border-[#eaedf0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-gray-300 transition-all card-hover"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="font-mono px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-[#e8f8f0] text-[#059669]">
                                {quiz.courseCode}
                              </span>

                              {isCompleted ? (
                                latestAttempt.passed ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Passed ({latestAttempt.score}%)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-100 text-rose-800">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    Retake ({latestAttempt.score}%)
                                  </span>
                                )
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                  Pending
                                </span>
                              )}
                            </div>

                            <h3 className="text-base font-bold text-gray-900 leading-snug">
                              {quiz.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                              {quiz.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-gray-100 text-[11px] font-mono text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#3ECE92]" />
                                {quiz.timeLimitMinutes} mins limit
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                                {quiz.questions.length} questions
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-amber-500" />
                                Pass: {quiz.passingPercentage}%
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[11px] text-gray-400 font-mono">
                              {isCompleted
                                ? `Taken: ${latestAttempt.completedAt.split('•')[0]}`
                                : 'Untimed until started'}
                            </span>

                            <button
                              onClick={() => setSelectedQuizForTest(quiz)}
                              id={`start-quiz-${quiz.id}`}
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                isCompleted
                                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  : 'bg-[#3ECE92] text-[#111614] hover:bg-[#34b780] shadow-sm'
                              }`}
                            >
                              <span>{isCompleted ? 'Retake Test' : 'Attend Test'}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Interactive Test Taking Player */}
        <TestTakingModal
          quiz={selectedQuizForTest}
          isOpen={!!selectedQuizForTest}
          onClose={() => setSelectedQuizForTest(null)}
          onCompleted={(att) => {
            showToast(
              `Assessment submitted! Score: ${att.score}% (${att.passed ? 'Passed' : 'Retake'})`
            );
          }}
        />

        {/* Modal: CSV Quiz Creator for Admins */}
        {isAdmin && (
          <CsvQuizUploadModal
            isOpen={isCsvQuizModalOpen}
            onClose={() => setIsCsvQuizModalOpen(false)}
            onSuccess={() => showToast('New quiz created and published to students!')}
          />
        )}
      </div>
    </AppShell>
  );
}
