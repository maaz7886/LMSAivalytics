'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useCourses } from '@/context/CourseContext';
import { AdminCurriculumView } from '@/components/courses/AdminCurriculumView';
import { LearnerCourseView } from '@/components/courses/LearnerCourseView';
import {
  Layers,
  Sparkles,
  BookOpen,
  Eye,
  Sliders,
} from 'lucide-react';

export default function CoursesPage() {
  const { user, role } = useAuth();
  const { activeCourse, modules, totalLessons } = useCourses();
  const isAdmin = role === 'admin' || user?.role === 'admin';

  // Admin view toggle: 'builder' | 'preview'
  const [adminViewMode, setAdminViewMode] = useState<'builder' | 'preview'>('builder');

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Control Bar for Admin Role */}
        {isAdmin && (
          <div className="bg-white rounded-2xl p-4 border border-border-subtle shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-mint-light text-brand-mint-text">
                <Sliders className="w-3.5 h-3.5" />
                Admin Console Mode
              </span>
              <span className="text-xs text-gray-500">
                {modules.length} Modules / {totalLessons} Units
              </span>
            </div>

            {/* Segmented Control */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto border border-gray-200/50">
              <button
                onClick={() => setAdminViewMode('builder')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  adminViewMode === 'builder'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-brand-mint-text" />
                <span>Curriculum Builder</span>
              </button>

              <button
                onClick={() => setAdminViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  adminViewMode === 'preview'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-brand-mint-text" />
                <span>Learner View Preview</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Render based on Role & Mode */}
        {isAdmin ? (
          adminViewMode === 'builder' ? (
            <AdminCurriculumView />
          ) : (
            <LearnerCourseView />
          )
        ) : (
          <LearnerCourseView />
        )}
      </div>
    </AppShell>
  );
}
