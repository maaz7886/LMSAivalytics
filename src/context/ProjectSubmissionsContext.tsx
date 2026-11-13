'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ProjectModule,
  ProjectSubpart,
  StudentProjectSubmission,
  ProjectSubmissionStats,
  SubmissionReviewStatus,
  SubmittedFile,
} from '@/types';
import {
  initialProjectModules,
  initialProjectSubmissions,
} from '@/data/projectSubmissionsData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface SubmitProjectParams {
  moduleId: string;
  subpartId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  files: SubmittedFile[];
  links: string[];
  studentNotes?: string;
}

interface AdminAddSubpartParams {
  moduleId: string;
  title: string;
  description: string;
  deadline: string;
  allowedFormats: ('pdf' | 'doc' | 'ppt' | 'image' | 'link')[];
  maxPoints?: number;
  guidelines?: string[];
}

interface AdminGiveRemarkParams {
  submissionId: string;
  remarks: string;
  status: SubmissionReviewStatus;
  score?: number;
  evaluatorName?: string;
}

interface ProjectSubmissionsContextType {
  modules: ProjectModule[];
  submissions: StudentProjectSubmission[];
  stats: ProjectSubmissionStats;
  isLoading: boolean;
  submitProject: (params: SubmitProjectParams) => Promise<StudentProjectSubmission>;
  adminAddModule: (moduleData: {
    title: string;
    subtitle: string;
    weeks: string;
    miniChallenge: string;
    deliverableBuild: string;
    certificationName?: string;
  }) => Promise<ProjectModule>;
  adminAddSubpart: (params: AdminAddSubpartParams) => Promise<ProjectSubpart>;
  adminUpdateDeadline: (subpartId: string, newDeadline: string) => Promise<void>;
  adminDeleteSubpart: (subpartId: string) => Promise<void>;
  adminGiveRemark: (params: AdminGiveRemarkParams) => Promise<void>;
  getSubmissionsByStudent: (studentEmail: string) => StudentProjectSubmission[];
  getSubmissionsBySubpart: (subpartId: string) => StudentProjectSubmission[];
  getStudentSubpartSubmission: (
    studentEmail: string,
    subpartId: string
  ) => StudentProjectSubmission | undefined;
  getModuleById: (moduleId: string) => ProjectModule | undefined;
  refreshSubmissions: () => Promise<void>;
}

const ProjectSubmissionsContext = createContext<ProjectSubmissionsContextType | undefined>(
  undefined
);

const MODULES_STORAGE_KEY = 'aivalytics_lms_modules_v2';
const SUBMISSIONS_STORAGE_KEY = 'aivalytics_lms_project_submissions_v2';

export const ProjectSubmissionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [modules, setModules] = useState<ProjectModule[]>(initialProjectModules);
  const [submissions, setSubmissions] = useState<StudentProjectSubmission[]>([]);

  // Hydrate from localStorage on client mount
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
        console.error('Failed to load cached project modules', err);
      }

      try {
        const stored = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSubmissions(parsed);
          }
        }
      } catch (err) {
        console.error('Failed to load cached project submissions', err);
      }
    }
  }, []);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
        localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
      } catch (err) {
        console.error('Failed to cache project state', err);
      }
    }
  }, [modules, submissions]);

  // Fetch project modules and submissions from Supabase Postgres
  const fetchProjectsFromDb = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data: moduleData, error: modError } = await supabase
        .from('ProjectModule')
        .select(`
          id,
          title,
          subtitle,
          weeks,
          miniChallenge,
          deliverableBuild,
          certificationName,
          order,
          subparts:ProjectSubpart (
            id,
            subpartCode,
            title,
            description,
            deadline,
            allowedFormats,
            maxPoints,
            guidelines,
            order
          )
        `)
        .order('order', { ascending: true });

      if (!modError && moduleData && moduleData.length > 0) {
        const formattedModules: ProjectModule[] = moduleData.map((m: any, idx: number) => ({
          id: m.id,
          moduleNumber: m.order || idx + 1,
          title: m.title,
          subtitle: m.subtitle || '',
          weeks: m.weeks || '',
          miniChallenge: m.miniChallenge || '',
          deliverableBuild: m.deliverableBuild || '',
          certificationName: m.certificationName || `${m.title} Certified`,
          status: idx === 0 ? ('active' as const) : ('upcoming' as const),
          subparts: (m.subparts || [])
            .sort((a: any, b: any) => a.order - b.order)
            .map((sp: any) => ({
              id: sp.id,
              moduleId: m.id,
              subpartCode: sp.subpartCode,
              title: sp.title,
              description: sp.description,
              deadline: sp.deadline,
              allowedFormats: sp.allowedFormats || ['pdf', 'link'],
              maxPoints: sp.maxPoints || 100,
              guidelines: sp.guidelines || [],
            })),
        }));

        setModules(formattedModules);
      }

      // Fetch Submissions
      const { data: subData, error: subError } = await supabase
        .from('ProjectSubmission')
        .select('*')
        .order('submittedAt', { ascending: false });

      if (!subError && subData && subData.length > 0) {
        const formattedSubmissions: StudentProjectSubmission[] = subData.map((s: any) => ({
          id: s.id,
          moduleId: s.moduleId,
          subpartId: s.subpartId,
          studentId: s.studentId,
          studentName: s.studentName,
          studentEmail: s.studentEmail,
          submittedAt: s.submittedAt
            ? new Date(s.submittedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Recent',
          status: (s.status as SubmissionReviewStatus) || 'PENDING_REVIEW',
          score: s.score || undefined,
          maxPoints: s.maxPoints || 100,
          adminEvaluatorName: s.evaluatorName || undefined,
          adminRemarks: s.evaluatorRemarks || undefined,
          adminEvaluatedAt: s.evaluatedAt
            ? new Date(s.evaluatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : undefined,
          studentNotes: s.studentNotes || undefined,
          files: (s.filesJson as SubmittedFile[]) || [],
          links: (s.linksJson as string[]) || [],
        }));

        setSubmissions(formattedSubmissions);
      }
    } catch (err) {
      console.error('Failed to sync project modules/submissions from DB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    fetchProjectsFromDb();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('realtime:projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ProjectModule' }, () => {
        fetchProjectsFromDb();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ProjectSubpart' }, () => {
        fetchProjectsFromDb();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ProjectSubmission' }, () => {
        fetchProjectsFromDb();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProjectsFromDb]);

  // Derived Stats
  const totalSubparts = useMemo(
    () => modules.reduce((acc, m) => acc + m.subparts.length, 0),
    [modules]
  );
  const totalSubmissions = submissions.length;
  const pendingReview = useMemo(
    () => submissions.filter((s) => s.status === 'PENDING_REVIEW').length,
    [submissions]
  );
  const approvedCount = useMemo(
    () => submissions.filter((s) => s.status === 'APPROVED' || s.status === 'EXCELLENT').length,
    [submissions]
  );
  const revisionRequestedCount = useMemo(
    () => submissions.filter((s) => s.status === 'REVISION_REQUESTED').length,
    [submissions]
  );

  const stats: ProjectSubmissionStats = useMemo(
    () => ({
      totalSubparts,
      totalSubmissions,
      pendingReview,
      approvedCount,
      revisionRequestedCount,
    }),
    [totalSubparts, totalSubmissions, pendingReview, approvedCount, revisionRequestedCount]
  );

  const submitProject = async (params: SubmitProjectParams): Promise<StudentProjectSubmission> => {
    const tempId = `subm_${Date.now()}`;
    const newSubmission: StudentProjectSubmission = {
      id: tempId,
      moduleId: params.moduleId,
      subpartId: params.subpartId,
      studentId: params.studentId,
      studentName: params.studentName,
      studentEmail: params.studentEmail,
      submittedAt: 'Just now',
      status: 'PENDING_REVIEW',
      maxPoints: 100,
      studentNotes: params.studentNotes,
      files: params.files,
      links: params.links,
    };

    setSubmissions((prev) => {
      const filtered = prev.filter(
        (s) => !(s.subpartId === params.subpartId && s.studentEmail.toLowerCase() === params.studentEmail.toLowerCase())
      );
      return [newSubmission, ...filtered];
    });

    if (isSupabaseConfigured) {
      try {
        const { data: dbRow } = await supabase
          .from('ProjectSubmission')
          .insert({
            moduleId: params.moduleId,
            subpartId: params.subpartId,
            studentId: params.studentId,
            studentEmail: params.studentEmail,
            studentName: params.studentName,
            status: 'PENDING_REVIEW',
            maxPoints: 100,
            studentNotes: params.studentNotes || null,
            filesJson: params.files,
            linksJson: params.links,
          })
          .select()
          .single();

        if (dbRow) {
          const persisted: StudentProjectSubmission = {
            ...newSubmission,
            id: dbRow.id,
          };
          setSubmissions((prev) => prev.map((s) => (s.id === tempId ? persisted : s)));
          return persisted;
        }
      } catch (err) {
        console.error('Error persisting ProjectSubmission to DB:', err);
      }
    }

    return newSubmission;
  };

  const adminAddModule = async (moduleData: {
    title: string;
    subtitle: string;
    weeks: string;
    miniChallenge: string;
    deliverableBuild: string;
    certificationName?: string;
  }): Promise<ProjectModule> => {
    const nextNumber = modules.length + 1;
    const tempId = `pmod_${Date.now()}`;
    const certName = moduleData.certificationName?.trim() || `${moduleData.title.trim()} Certified`;
    const newModule: ProjectModule = {
      id: tempId,
      moduleNumber: nextNumber,
      title: moduleData.title.trim(),
      subtitle: moduleData.subtitle.trim(),
      weeks: moduleData.weeks.trim(),
      miniChallenge: moduleData.miniChallenge.trim(),
      deliverableBuild: moduleData.deliverableBuild.trim(),
      certificationName: certName,
      status: 'upcoming',
      subparts: [],
    };

    setModules((prev) => [...prev, newModule]);

    if (isSupabaseConfigured) {
      try {
        const { data: dbMod } = await supabase
          .from('ProjectModule')
          .insert({
            title: moduleData.title.trim(),
            subtitle: moduleData.subtitle.trim(),
            weeks: moduleData.weeks.trim(),
            miniChallenge: moduleData.miniChallenge.trim(),
            deliverableBuild: moduleData.deliverableBuild.trim(),
            certificationName: certName,
            order: nextNumber,
          })
          .select()
          .single();

        if (dbMod) {
          const persisted: ProjectModule = {
            ...newModule,
            id: dbMod.id,
          };
          setModules((prev) => prev.map((m) => (m.id === tempId ? persisted : m)));
          return persisted;
        }
      } catch (err) {
        console.error('Error inserting ProjectModule to DB:', err);
      }
    }

    return newModule;
  };

  const adminAddSubpart = async (params: AdminAddSubpartParams): Promise<ProjectSubpart> => {
    const targetMod = modules.find((m) => m.id === params.moduleId);
    const modNumber = targetMod?.moduleNumber || 1;
    const currentCount = (targetMod?.subparts.length || 0) + 1;
    const tempId = `psub_${Date.now()}`;

    const newSubpart: ProjectSubpart = {
      id: tempId,
      moduleId: params.moduleId,
      subpartCode: `${modNumber}.${currentCount}`,
      title: params.title.trim(),
      description: params.description.trim(),
      deadline: params.deadline.trim(),
      allowedFormats: params.allowedFormats,
      maxPoints: params.maxPoints || 100,
      guidelines: params.guidelines || [],
    };

    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== params.moduleId) return m;
        return {
          ...m,
          subparts: [...m.subparts, newSubpart],
        };
      })
    );

    if (isSupabaseConfigured) {
      try {
        const { data: dbSub } = await supabase
          .from('ProjectSubpart')
          .insert({
            moduleId: params.moduleId,
            subpartCode: newSubpart.subpartCode,
            title: params.title.trim(),
            description: params.description.trim(),
            deadline: params.deadline.trim(),
            allowedFormats: params.allowedFormats,
            maxPoints: params.maxPoints || 100,
            guidelines: params.guidelines || [],
            order: currentCount,
          })
          .select()
          .single();

        if (dbSub) {
          const persisted: ProjectSubpart = {
            ...newSubpart,
            id: dbSub.id,
          };
          setModules((prev) =>
            prev.map((m) => {
              if (m.id !== params.moduleId) return m;
              return {
                ...m,
                subparts: m.subparts.map((sp) => (sp.id === tempId ? persisted : sp)),
              };
            })
          );
          return persisted;
        }
      } catch (err) {
        console.error('Error inserting ProjectSubpart to DB:', err);
      }
    }

    return newSubpart;
  };

  const adminUpdateDeadline = async (subpartId: string, newDeadline: string) => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        subparts: m.subparts.map((sp) => (sp.id === subpartId ? { ...sp, deadline: newDeadline } : sp)),
      }))
    );

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('ProjectSubpart')
          .update({ deadline: newDeadline })
          .eq('id', subpartId);
      } catch (err) {
        console.error('Error updating deadline in DB:', err);
      }
    }
  };

  const adminDeleteSubpart = async (subpartId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        const has = m.subparts.some((sp) => sp.id === subpartId);
        if (!has) return m;
        const filtered = m.subparts.filter((sp) => sp.id !== subpartId);
        return {
          ...m,
          subparts: filtered.map((sp, idx) => ({
            ...sp,
            subpartCode: `${m.moduleNumber}.${idx + 1}`,
          })),
        };
      })
    );

    if (isSupabaseConfigured) {
      try {
        await supabase.from('ProjectSubpart').delete().eq('id', subpartId);
      } catch (err) {
        console.error('Error deleting ProjectSubpart from DB:', err);
      }
    }
  };

  const adminGiveRemark = async (params: AdminGiveRemarkParams) => {
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id !== params.submissionId) return s;
        return {
          ...s,
          status: params.status,
          adminRemarks: params.remarks,
          score: params.score !== undefined ? params.score : s.score,
          adminEvaluatorName: params.evaluatorName || 'Lead Course Evaluator',
          adminEvaluatedAt: 'Just now',
        };
      })
    );

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('ProjectSubmission')
          .update({
            status: params.status,
            evaluatorRemarks: params.remarks,
            score: params.score,
            evaluatorName: params.evaluatorName || 'Lead Course Evaluator',
            evaluatedAt: new Date().toISOString(),
          })
          .eq('id', params.submissionId);
      } catch (err) {
        console.error('Error updating submission remark in DB:', err);
      }
    }
  };

  const getSubmissionsByStudent = (studentEmail: string) => {
    if (!studentEmail || !studentEmail.trim()) return [];
    return submissions.filter(
      (s) => s.studentEmail && s.studentEmail.toLowerCase() === studentEmail.toLowerCase().trim()
    );
  };

  const getSubmissionsBySubpart = (subpartId: string) => {
    return submissions.filter((s) => s.subpartId === subpartId);
  };

  const getStudentSubpartSubmission = (studentEmail: string, subpartId: string) => {
    if (!studentEmail || !studentEmail.trim()) return undefined;
    return submissions.find(
      (s) =>
        s.studentEmail &&
        s.studentEmail.toLowerCase() === studentEmail.toLowerCase().trim() &&
        s.subpartId === subpartId
    );
  };

  const getModuleById = (moduleId: string) => {
    return modules.find((m) => m.id === moduleId);
  };

  return (
    <ProjectSubmissionsContext.Provider
      value={{
        modules,
        submissions,
        stats,
        isLoading,
        submitProject,
        adminAddModule,
        adminAddSubpart,
        adminUpdateDeadline,
        adminDeleteSubpart,
        adminGiveRemark,
        getSubmissionsByStudent,
        getSubmissionsBySubpart,
        getStudentSubpartSubmission,
        getModuleById,
        refreshSubmissions: fetchProjectsFromDb,
      }}
    >
      {children}
    </ProjectSubmissionsContext.Provider>
  );
};

export const useProjectSubmissions = () => {
  const context = useContext(ProjectSubmissionsContext);
  if (!context) {
    throw new Error('useProjectSubmissions must be used within a ProjectSubmissionsProvider');
  }
  return context;
};
