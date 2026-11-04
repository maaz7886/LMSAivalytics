'use client';

import React, { useState } from 'react';
import { useCourses } from '@/context/CourseContext';
import Link from 'next/link';
import {
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
  Compass,
} from 'lucide-react';

export const LearnerCourseView: React.FC = () => {
  const {
    activeCourse,
    modules,
    courseProgress,
    totalLessons,
    completedLessonsCount,
    isLessonCompleted,
  } = useCourses();

  // Expanded modules state
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([modules[0]?.id || 'mod_1']);

  const toggleModuleExpand = (modId: string) => {
    setExpandedModuleIds((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  // Find next uncompleted lesson
  const allSubmodules = modules.flatMap((m) => m.submodules);
  const nextLesson = allSubmodules.find((s) => !isLessonCompleted(s.id)) || allSubmodules[0];

  return (
    <div className="space-y-6">
      {/* ================= HERO CARD: AI-NATIVE PROJECT MANAGEMENT ================= */}
      <div className="bg-gradient-to-br from-brand-dark via-brand-dark-soft to-brand-dark text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-800 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-mint/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
              <Sparkles className="w-3.5 h-3.5" />
              Flagship Program: {activeCourse.code}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-300">
              3-Month Executive Curriculum
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              3 Professional Certifications
            </span>
          </div>

          {/* Headline & Subtitle */}
          <div className="max-w-3xl space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {activeCourse.title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              &ldquo;This is not just a course. This is an AI-native execution system. You don&rsquo;t just learn how execution works. You build and run it.&rdquo;
            </p>
          </div>

          {/* Progress Bar & Next Lesson Callout */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 max-w-3xl space-y-3 backdrop-blur-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-white">
                <span>Program Progress</span>
                <span className="text-brand-mint font-bold text-sm font-mono">{courseProgress}%</span>
              </div>
              <div className="text-gray-400 font-mono text-[11px]">
                {completedLessonsCount} of {totalLessons} syllabus units completed
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-mint rounded-full transition-transform duration-500 shadow-sm"
                style={{ width: `${courseProgress}%` }}
              />
            </div>

            {/* Next lesson trigger */}
            {nextLesson && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-brand-mint shrink-0" />
                  <span className="text-gray-300">
                    <span className="text-gray-400 font-mono">Next:</span>{' '}
                    <strong className="text-white font-medium">Part {nextLesson.subpartCode}: {nextLesson.title}</strong>
                  </span>
                </div>

                <Link
                  href={`/courses/${activeCourse.id}?lesson=${nextLesson.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-brand-dark bg-brand-mint hover:bg-brand-mint-hover shadow-md transition-colors self-start sm:self-auto active:scale-95 shrink-0"
                >
                  <span>Resume Learning</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 3 PROGRAM MODULES BREAKDOWN ================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Curriculum Syllabus & Modules</h2>
            <p className="text-xs text-gray-500">
              Master the execution stack across 3 core certifications
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-[#059669] bg-[#e8f8f0] px-3 py-1 rounded-full">
            {modules.length} Modules • {totalLessons} Lessons
          </span>
        </div>

        <div className="space-y-4">
          {modules.map((module) => {
            const isExpanded = expandedModuleIds.includes(module.id);
            const modCompletedCount = module.submodules.filter((s) =>
              isLessonCompleted(s.id)
            ).length;
            const modPercentage =
              module.submodules.length > 0
                ? Math.round((modCompletedCount / module.submodules.length) * 100)
                : 0;

            return (
              <div
                key={module.id}
                className="bg-white rounded-2xl border border-[#eaedf0] shadow-xs overflow-hidden transition-all"
              >
                {/* Module Summary Header (Collapsible) */}
                <div
                  onClick={() => toggleModuleExpand(module.id)}
                  className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors select-none"
                >
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-brand-mint-text bg-brand-mint-light px-2.5 py-0.5 rounded-md">
                        Module {module.moduleNumber} ({module.weeks})
                      </span>
                      {module.certificationName && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          {module.certificationName}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-gray-900">{module.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{module.subtitle}</p>
                  </div>

                  {/* Progress Pill & Expand Indicator */}
                  <div className="flex items-center gap-3 self-start md:self-center shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-gray-900">
                        {modCompletedCount}/{module.submodules.length} Completed
                      </div>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-brand-mint-text rounded-full transition-colors"
                          style={{ width: `${modPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-1.5 rounded-xl bg-gray-100 text-gray-500 hover:text-gray-900">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-modules List */}
                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100 bg-[#fbfdfc]">
                    {module.submodules.map((subpart) => {
                      const completed = isLessonCompleted(subpart.id);

                      return (
                        <div
                          key={subpart.id}
                          className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-3 hover:bg-white transition-colors"
                        >
                          <div className="space-y-1 max-w-2xl">
                            <div className="flex items-center gap-2">
                              {completed ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                  <Clock className="w-3 h-3" />
                                </div>
                              )}

                              <span className="font-mono text-xs font-bold text-gray-500">
                                Part {subpart.subpartCode}
                              </span>

                              <h4 className="text-sm font-semibold text-gray-900">
                                {subpart.title}
                              </h4>

                              <span className="text-[11px] font-mono text-gray-400 ml-1">
                                {subpart.duration}
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 pl-7 leading-relaxed">
                              {subpart.description}
                            </p>

                            {/* Takeaways */}
                            {subpart.takeaways && subpart.takeaways.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pl-7 pt-1">
                                {subpart.takeaways.slice(0, 3).map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200/60"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Direct Launch Link */}
                          <Link
                            href={`/courses/${activeCourse.id}?lesson=${subpart.id}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors self-start md:self-center shrink-0 ${
                              completed
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                                : 'bg-brand-dark text-white hover:bg-black shadow-xs'
                            }`}
                          >
                            <Play className="w-3 h-3" />
                            <span>{completed ? 'Review' : 'Start'}</span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= VALUE PILLARS & PROGRAM HIGHLIGHTS (PAGE 5 PDF) ================= */}
      <div className="bg-white rounded-2xl p-6 border border-[#eaedf0] shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase font-mono tracking-wider">
          Program Outcomes & Executive Support
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 mb-2">
              <Award className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-gray-900">3 Professional Certifications</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Earn verified proof-of-work in AI Foundations, Multi-Agent Systems, and AI-Native PM.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 mb-2">
              <Compass className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-gray-900">Live Cohort Learning</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Structured sessions, practical assignments, and weekly interactive labs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 mb-2">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-gray-900">Real-World Projects</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Build autonomous agents, n8n workflows, and GTM execution delivery systems.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-gray-900">Job-Readiness & Portfolio</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Position yourself for modern AI-Native Project Manager and Operations Lead roles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
