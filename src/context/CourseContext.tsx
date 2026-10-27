'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Course, CurriculumModule, CourseSubmodule } from '@/types';
import {
  flagshipCourse,
  flagshipCoursesList,
  initialCurriculumModules,
} from '@/data/flagshipCourseData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface AdminAddModuleParams {
  courseId?: string;
  title: string;
  subtitle: string;
  weeks: string;
  certificationName?: string;
}

interface AdminEditModuleParams {
  moduleId: string;
  title: string;
  subtitle: string;
  weeks: string;
  certificationName?: string;
}

interface AdminAddSubmoduleParams {
  moduleId: string;
  title: string;
  description: string;
  duration?: string;
  videoUrl?: string;
  type?: 'video' | 'interactive' | 'challenge' | 'reading';
  takeaways?: string[];
}

interface AdminEditSubmoduleParams {
  submoduleId: string;
  title: string;
  description: string;
  duration?: string;
  videoUrl?: string;
  type?: 'video' | 'interactive' | 'challenge' | 'reading';
  takeaways?: string[];
}

interface CourseContextType {
  courses: Course[];
  activeCourse: Course;
  modules: CurriculumModule[];
  completedLessonIds: string[];
  courseProgress: number;
  totalLessons: number;
  completedLessonsCount: number;
  isLoading: boolean;
  // Admin Operations
  adminAddModule: (params: AdminAddModuleParams) => Promise<CurriculumModule>;
  adminEditModule: (params: AdminEditModuleParams) => Promise<void>;
  adminDeleteModule: (moduleId: string) => Promise<void>;
  adminAddSubmodule: (params: AdminAddSubmoduleParams) => Promise<CourseSubmodule>;
  adminEditSubmodule: (params: AdminEditSubmoduleParams) => Promise<void>;
  adminDeleteSubmodule: (submoduleId: string) => Promise<void>;
  // Learner Operations
  toggleLessonComplete: (lessonId: string) => Promise<void>;
  isLessonCompleted: (lessonId: string) => boolean;
  getCourseById: (courseId: string) => Course | undefined;
  getModuleById: (moduleId: string) => CurriculumModule | undefined;
  getSubmoduleById: (submoduleId: string) => CourseSubmodule | undefined;
  refreshCourseData: () => Promise<void>;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

const MODULES_STORAGE_KEY = 'aivalytics_lms_curriculum_modules_v3';
const COMPLETED_LESSONS_STORAGE_KEY = 'aivalytics_lms_completed_lessons_v3';

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>(flagshipCoursesList);
  const [modules, setModules] = useState<CurriculumModule[]>(initialCurriculumModules);

  // Hydrate cached modules from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(MODULES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setModules(parsed);
          }
        }
      } catch (err) {
        console.error('Failed to load cached modules:', err);
      }
    }
  }, []);

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const userLessonKey = user?.id ? `aivalytics_lms_completed_lessons_${user.id}` : null;

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
        if (userLessonKey) {
          localStorage.setItem(userLessonKey, JSON.stringify(completedLessonIds));
        }
      } catch (err) {
        console.error('Failed to cache course state:', err);
      }
    }
  }, [modules, completedLessonIds, userLessonKey]);

  // Fetch course, modules, lessons and user progress from Supabase Postgres
  const fetchCourseDataFromDb = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // 1. Fetch Course with modules and lessons
      const { data: courseRows, error: courseErr } = await supabase
        .from('Course')
        .select(`
          id,
          code,
          title,
          description,
          category,
          modules:CourseModule (
            id,
            title,
            subtitle,
            weeks,
            certificationName,
            order,
            courseId,
            lessons:Lesson (
              id,
              title,
              description,
              order,
              durationMin,
              videoUrl,
              type,
              moduleId
            )
          )
        `)
        .eq('code', 'AINPM-101')
        .maybeSingle();

      if (courseErr) {
        console.warn('Supabase course fetch notice:', courseErr.message);
      } else if (courseRows && courseRows.modules && courseRows.modules.length > 0) {
        const sortedModules = (courseRows.modules as any[])
          .sort((a, b) => a.order - b.order)
          .map((m, idx) => {
            const sortedLessons = (m.lessons || []).sort((a: any, b: any) => a.order - b.order);
            const submodules: CourseSubmodule[] = sortedLessons.map((l: any, lIdx: number) => ({
              id: l.id,
              moduleId: m.id,
              subpartCode: `${m.order || idx + 1}.${l.order || lIdx + 1}`,
              title: l.title,
              description: l.description || '',
              duration: `${l.durationMin || 45}m`,
              videoUrl: l.videoUrl || 'https://example.com/videos/module-1-lesson',
              type: l.type || 'video',
              isCompleted: false, // Computed below with user progress
              order: l.order || lIdx + 1,
              takeaways: ['Key framework application & execution best practices.'],
              resources: [
                { name: `${l.title.replace(/\s+/g, '_')}_Study_Guide.pdf`, url: '#', size: '1.8 MB' },
              ],
            }));

            return {
              id: m.id,
              courseId: m.courseId || courseRows.id,
              moduleNumber: m.order || idx + 1,
              title: m.title,
              subtitle: m.subtitle || '',
              weeks: m.weeks || `Weeks ${(idx * 4) + 1}–${(idx + 1) * 4}`,
              certificationName: m.certificationName || `${m.title} Certified`,
              order: m.order || idx + 1,
              status: idx === 0 ? ('active' as const) : ('upcoming' as const),
              submodules,
            };
          });

        setModules(sortedModules);
      }

      // 2. Fetch UserLessonProgress if user is logged in
      if (user?.id) {
        const { data: progressData, error: progErr } = await supabase
          .from('UserLessonProgress')
          .select('lessonId, completed')
          .eq('userId', user.id);

        if (!progErr && progressData) {
          const completedIds = progressData
            .filter((p: any) => p.completed)
            .map((p: any) => p.lessonId);
          setCompletedLessonIds(completedIds);
        } else {
          setCompletedLessonIds([]);
        }
      } else {
        setCompletedLessonIds([]);
      }
    } catch (err) {
      console.error('Failed to sync course data from DB:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Realtime subscription for CourseModule and Lesson changes
  useEffect(() => {
    fetchCourseDataFromDb();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('realtime:curriculum')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'CourseModule' }, () => {
        fetchCourseDataFromDb();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Lesson' }, () => {
        fetchCourseDataFromDb();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCourseDataFromDb]);

  // Derived metrics
  const allSubmodules = useMemo(() => modules.flatMap((m) => m.submodules), [modules]);
  const totalLessons = allSubmodules.length;
  const completedLessonsCount = allSubmodules.filter((s) =>
    completedLessonIds.includes(s.id)
  ).length;

  const courseProgress =
    totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

  // Active course with dynamically computed metrics
  const activeCourse: Course = useMemo(
    () => ({
      ...flagshipCourse,
      totalModules: modules.length,
      totalLessons,
      completedLessons: completedLessonsCount,
      progress: courseProgress,
      modules,
    }),
    [modules, totalLessons, completedLessonsCount, courseProgress]
  );

  const currentCourses = useMemo(() => [activeCourse], [activeCourse]);

  // Helper getters
  const getCourseById = (courseId: string) => {
    return currentCourses.find((c) => c.id === courseId || c.code.toLowerCase() === courseId.toLowerCase()) || activeCourse;
  };

  const getModuleById = (moduleId: string) => {
    return modules.find((m) => m.id === moduleId);
  };

  const getSubmoduleById = (submoduleId: string) => {
    return allSubmodules.find((s) => s.id === submoduleId);
  };

  const isLessonCompleted = (lessonId: string) => {
    return completedLessonIds.includes(lessonId);
  };

  // Learner Action: Toggle lesson completion with DB persistence
  const toggleLessonComplete = async (lessonId: string) => {
    const isCurrentlyDone = completedLessonIds.includes(lessonId);
    const nextCompleted = !isCurrentlyDone;

    // 1. Optimistic update
    setCompletedLessonIds((prev) =>
      isCurrentlyDone ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );

    // 2. Persist to UserLessonProgress in Supabase
    if (isSupabaseConfigured && user?.id) {
      try {
        await supabase.from('UserLessonProgress').upsert(
          {
            userId: user.id,
            lessonId,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : null,
          },
          { onConflict: 'userId,lessonId' }
        );
      } catch (err) {
        console.error('Error saving lesson progress to DB:', err);
      }
    }
  };

  // Admin Action: Add Module with DB persistence
  const adminAddModule = async ({
    title,
    subtitle,
    weeks,
    certificationName,
  }: AdminAddModuleParams): Promise<CurriculumModule> => {
    const nextNumber = modules.length + 1;
    const tempId = `mod_${Date.now()}`;
    const newModule: CurriculumModule = {
      id: tempId,
      courseId: activeCourse.id,
      moduleNumber: nextNumber,
      title: title.trim(),
      subtitle: subtitle.trim(),
      weeks: weeks.trim(),
      certificationName: certificationName?.trim() || `${title.trim()} Certified`,
      order: nextNumber,
      status: 'upcoming',
      submodules: [],
    };

    setModules((prev) => [...prev, newModule]);

    if (isSupabaseConfigured) {
      try {
        const { data: dbMod, error } = await supabase
          .from('CourseModule')
          .insert({
            courseId: activeCourse.id,
            title: title.trim(),
            subtitle: subtitle.trim(),
            weeks: weeks.trim(),
            certificationName: certificationName?.trim() || `${title.trim()} Certified`,
            order: nextNumber,
          })
          .select()
          .single();

        if (!error && dbMod) {
          const persisted: CurriculumModule = {
            ...newModule,
            id: dbMod.id,
          };
          setModules((prev) => prev.map((m) => (m.id === tempId ? persisted : m)));
          return persisted;
        }
      } catch (err) {
        console.error('Error inserting CourseModule to DB:', err);
      }
    }

    return newModule;
  };

  // Admin Action: Edit Module with DB persistence
  const adminEditModule = async ({
    moduleId,
    title,
    subtitle,
    weeks,
    certificationName,
  }: AdminEditModuleParams) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          title: title.trim(),
          subtitle: subtitle.trim(),
          weeks: weeks.trim(),
          certificationName: certificationName ? certificationName.trim() : m.certificationName,
        };
      })
    );

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('CourseModule')
          .update({
            title: title.trim(),
            subtitle: subtitle.trim(),
            weeks: weeks.trim(),
            certificationName: certificationName?.trim(),
          })
          .eq('id', moduleId);
      } catch (err) {
        console.error('Error updating CourseModule in DB:', err);
      }
    }
  };

  // Admin Action: Delete Module with DB persistence
  const adminDeleteModule = async (moduleId: string) => {
    setModules((prev) => {
      const filtered = prev.filter((m) => m.id !== moduleId);
      return filtered.map((m, idx) => ({
        ...m,
        moduleNumber: idx + 1,
        order: idx + 1,
      }));
    });

    if (isSupabaseConfigured) {
      try {
        await supabase.from('CourseModule').delete().eq('id', moduleId);
      } catch (err) {
        console.error('Error deleting CourseModule from DB:', err);
      }
    }
  };

  // Admin Action: Add Sub-module (Lesson) with DB persistence
  const adminAddSubmodule = async ({
    moduleId,
    title,
    description,
    duration = '45m',
    videoUrl,
    type = 'video',
    takeaways = [],
  }: AdminAddSubmoduleParams): Promise<CourseSubmodule> => {
    const targetModule = modules.find((m) => m.id === moduleId);
    const modNumber = targetModule?.moduleNumber || 1;
    const currentSubCount = (targetModule?.submodules.length || 0) + 1;
    const tempId = `sub_${Date.now()}`;
    const durationMin = parseInt(duration) || 45;

    const newSubmodule: CourseSubmodule = {
      id: tempId,
      moduleId,
      subpartCode: `${modNumber}.${currentSubCount}`,
      title: title.trim(),
      description: description.trim(),
      duration: `${durationMin}m`,
      videoUrl: videoUrl?.trim() || 'https://example.com/videos/lecture-placeholder',
      type,
      isCompleted: false,
      order: currentSubCount,
      takeaways: takeaways.length > 0 ? takeaways : ['Key framework application & execution best practices.'],
      resources: [
        { name: `${title.replace(/\s+/g, '_')}_Study_Guide.pdf`, url: '#', size: '1.8 MB' },
      ],
    };

    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          submodules: [...m.submodules, newSubmodule],
        };
      })
    );

    if (isSupabaseConfigured) {
      try {
        const { data: dbLesson, error } = await supabase
          .from('Lesson')
          .insert({
            moduleId,
            title: title.trim(),
            description: description.trim(),
            durationMin,
            videoUrl: videoUrl?.trim() || 'https://example.com/videos/lecture-placeholder',
            type,
            order: currentSubCount,
          })
          .select()
          .single();

        if (!error && dbLesson) {
          const persisted: CourseSubmodule = {
            ...newSubmodule,
            id: dbLesson.id,
          };
          setModules((prev) =>
            prev.map((m) => {
              if (m.id !== moduleId) return m;
              return {
                ...m,
                submodules: m.submodules.map((s) => (s.id === tempId ? persisted : s)),
              };
            })
          );
          return persisted;
        }
      } catch (err) {
        console.error('Error inserting Lesson to DB:', err);
      }
    }

    return newSubmodule;
  };

  // Admin Action: Edit Submodule with DB persistence
  const adminEditSubmodule = async ({
    submoduleId,
    title,
    description,
    duration,
    videoUrl,
    type,
    takeaways,
  }: AdminEditSubmoduleParams) => {
    const durationMin = duration ? parseInt(duration) || 45 : undefined;

    setModules((prev) =>
      prev.map((m) => {
        const hasSub = m.submodules.some((s) => s.id === submoduleId);
        if (!hasSub) return m;

        return {
          ...m,
          submodules: m.submodules.map((s) => {
            if (s.id !== submoduleId) return s;
            return {
              ...s,
              title: title.trim(),
              description: description.trim(),
              duration: duration ? duration.trim() : s.duration,
              videoUrl: videoUrl ? videoUrl.trim() : s.videoUrl,
              type: type || s.type,
              takeaways: takeaways || s.takeaways,
            };
          }),
        };
      })
    );

    if (isSupabaseConfigured) {
      try {
        const updatePayload: Record<string, any> = {
          title: title.trim(),
          description: description.trim(),
        };
        if (durationMin !== undefined) updatePayload.durationMin = durationMin;
        if (videoUrl !== undefined) updatePayload.videoUrl = videoUrl.trim();
        if (type !== undefined) updatePayload.type = type;

        await supabase.from('Lesson').update(updatePayload).eq('id', submoduleId);
      } catch (err) {
        console.error('Error updating Lesson in DB:', err);
      }
    }
  };

  // Admin Action: Delete Submodule with DB persistence
  const adminDeleteSubmodule = async (submoduleId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        const hasSub = m.submodules.some((s) => s.id === submoduleId);
        if (!hasSub) return m;

        const filtered = m.submodules.filter((s) => s.id !== submoduleId);
        const reindexed = filtered.map((s, idx) => ({
          ...s,
          subpartCode: `${m.moduleNumber}.${idx + 1}`,
          order: idx + 1,
        }));

        return {
          ...m,
          submodules: reindexed,
        };
      })
    );

    if (isSupabaseConfigured) {
      try {
        await supabase.from('Lesson').delete().eq('id', submoduleId);
      } catch (err) {
        console.error('Error deleting Lesson from DB:', err);
      }
    }
  };

  return (
    <CourseContext.Provider
      value={{
        courses: currentCourses,
        activeCourse,
        modules,
        completedLessonIds,
        courseProgress,
        totalLessons,
        completedLessonsCount,
        isLoading,
        adminAddModule,
        adminEditModule,
        adminDeleteModule,
        adminAddSubmodule,
        adminEditSubmodule,
        adminDeleteSubmodule,
        toggleLessonComplete,
        isLessonCompleted,
        getCourseById,
        getModuleById,
        getSubmoduleById,
        refreshCourseData: fetchCourseDataFromDb,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};

export const useCourses = (): CourseContextType => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return context;
};
