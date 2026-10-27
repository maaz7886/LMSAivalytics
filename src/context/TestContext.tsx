'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Quiz, QuizQuestion, StudentQuizAttempt, QuizStats } from '@/types';
import { initialQuizzes, initialQuizAttempts } from '@/data/quizMockData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface CreateQuizFromCsvParams {
  title: string;
  courseCode: string;
  courseName: string;
  timeLimitMinutes: number;
  passingPercentage: number;
  description?: string;
  csvContent: string;
}

interface TestContextType {
  quizzes: Quiz[];
  attempts: StudentQuizAttempt[];
  stats: QuizStats;
  isLoading: boolean;
  addQuiz: (quiz: Quiz) => Promise<void>;
  createQuizFromCsv: (params: CreateQuizFromCsvParams) => Promise<{ success: boolean; error?: string; quiz?: Quiz }>;
  submitQuizAttempt: (attemptData: Omit<StudentQuizAttempt, 'id' | 'completedAt'>) => Promise<StudentQuizAttempt>;
  deleteQuiz: (quizId: string) => Promise<void>;
  getAttemptsByQuiz: (quizId: string) => StudentQuizAttempt[];
  getAttemptsByStudent: (studentEmail: string) => StudentQuizAttempt[];
  getQuizById: (quizId: string) => Quiz | undefined;
  refreshQuizzes: () => Promise<void>;
}

const TestContext = createContext<TestContextType | undefined>(undefined);

const QUIZZES_STORAGE_KEY = 'aivalytics_lms_quizzes_v2';
const ATTEMPTS_STORAGE_KEY = 'aivalytics_lms_attempts_v2';

export const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(QUIZZES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (err) {
        console.error('Failed to load cached quizzes', err);
      }
    }
    return initialQuizzes;
  });

  const [attempts, setAttempts] = useState<StudentQuizAttempt[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (err) {
        console.error('Failed to load cached quiz attempts', err);
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(QUIZZES_STORAGE_KEY, JSON.stringify(quizzes));
        localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
      } catch (err) {
        console.error('Failed to cache quiz state', err);
      }
    }
  }, [quizzes, attempts]);

  // Fetch quizzes and attempts from Supabase Postgres
  const fetchQuizzesFromDb = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data: quizData, error: quizError } = await supabase
        .from('Quiz')
        .select(`
          id,
          title,
          courseCode,
          courseName,
          timeLimitMinutes,
          passingPercentage,
          description,
          questions:QuizQuestion (
            id,
            questionNumber,
            questionText,
            optionsJson,
            correctOption,
            explanation
          )
        `);

      if (!quizError && quizData && quizData.length > 0) {
        const formatted: Quiz[] = quizData.map((q: any) => {
          const questions: QuizQuestion[] = (q.questions || [])
            .sort((a: any, b: any) => a.questionNumber - b.questionNumber)
            .map((quest: any) => ({
              id: quest.id,
              questionNumber: quest.questionNumber,
              questionText: quest.questionText,
              options: quest.optionsJson || { A: '', B: '', C: '', D: '' },
              correctOption: quest.correctOption as 'A' | 'B' | 'C' | 'D',
              explanation: quest.explanation || '',
              points: 5,
            }));

          const totalPoints = questions.reduce((sum, qItem) => sum + qItem.points, 0) || 100;

          return {
            id: q.id,
            title: q.title,
            courseCode: q.courseCode || 'AINPM-101',
            courseName: q.courseName || 'AI-Native Project Management',
            timeLimitMinutes: q.timeLimitMinutes,
            passingPercentage: q.passingPercentage,
            totalPoints,
            questions,
            createdAt: 'Recently updated',
            status: 'Published' as const,
            totalAttempts: 12,
            avgScore: 84,
            passRate: 91,
            description: q.description || '',
          };
        });

        setQuizzes(formatted);
      }

      // Fetch attempts
      const { data: attemptData, error: attemptError } = await supabase
        .from('QuizAttempt')
        .select('*')
        .order('completedAt', { ascending: false });

      if (!attemptError && attemptData && attemptData.length > 0) {
        const formattedAttempts: StudentQuizAttempt[] = attemptData.map((a: any) => ({
          id: a.id,
          quizId: a.quizId,
          quizTitle: 'Milestone Assessment',
          courseCode: 'AINPM-101',
          studentId: a.studentEmail,
          studentEmail: a.studentEmail,
          studentName: a.studentName,
          score: a.score,
          pointsScored: Math.round((a.score / 100) * 100),
          totalPoints: 100,
          passed: a.passed,
          answers: {},
          completedAt: a.completedAt
            ? new Date(a.completedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Recent',
          timeSpentSeconds: a.timeSpentSeconds,
        }));

        setAttempts(formattedAttempts);
      }
    } catch (err) {
      console.error('Failed to sync quizzes from DB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    fetchQuizzesFromDb();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('realtime:quizzes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Quiz' }, () => {
        fetchQuizzesFromDb();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'QuizAttempt' }, () => {
        fetchQuizzesFromDb();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQuizzesFromDb]);

  // Derived Quiz Statistics
  const totalQuizzes = quizzes.length;
  const totalAttempts = attempts.length;
  const avgScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
      : 85;
  const passedAttempts = attempts.filter((a) => a.passed).length;
  const passRate =
    attempts.length > 0 ? Math.round((passedAttempts / attempts.length) * 100) : 90;

  const stats: QuizStats = useMemo(
    () => ({
      totalQuizzes,
      totalAttempts,
      avgScore,
      passRate,
    }),
    [totalQuizzes, totalAttempts, avgScore, passRate]
  );

  const addQuiz = async (newQuiz: Quiz) => {
    setQuizzes((prev) => [newQuiz, ...prev]);

    if (!isSupabaseConfigured) return;

    try {
      const { data: quizRow } = await supabase
        .from('Quiz')
        .insert({
          id: newQuiz.id,
          title: newQuiz.title,
          courseCode: newQuiz.courseCode,
          courseName: newQuiz.courseName,
          timeLimitMinutes: newQuiz.timeLimitMinutes,
          passingPercentage: newQuiz.passingPercentage,
          description: newQuiz.description,
        })
        .select()
        .single();

      if (quizRow && newQuiz.questions.length > 0) {
        const questionRows = newQuiz.questions.map((q) => ({
          quizId: quizRow.id,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          optionsJson: q.options,
          correctOption: q.correctOption,
          explanation: q.explanation || '',
        }));

        await supabase.from('QuizQuestion').insert(questionRows);
      }
    } catch (err) {
      console.error('Error inserting Quiz to DB:', err);
    }
  };

  // Helper function to parse CSV lines into questions
  const parseQuizCsv = (csvText: string): { questions: QuizQuestion[]; error?: string } => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return { questions: [], error: 'CSV file must contain a header and at least one question row.' };
    }

    const header = lines[0].toLowerCase();
    if (
      !header.includes('questiontext') ||
      !header.includes('optiona') ||
      !header.includes('correctoption')
    ) {
      return {
        questions: [],
        error: 'Invalid CSV header format. Expected headers: questionNumber,questionText,optionA,optionB,optionC,optionD,correctOption,explanation',
      };
    }

    const questions: QuizQuestion[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const rowMatches: string[] = [];
      let currentVal = '';
      let insideQuotes = false;

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          rowMatches.push(currentVal.trim().replace(/^"|"$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      rowMatches.push(currentVal.trim().replace(/^"|"$/g, ''));

      if (rowMatches.length < 7) continue;

      const qNum = parseInt(rowMatches[0], 10) || i;
      const qText = rowMatches[1];
      const optA = rowMatches[2];
      const optB = rowMatches[3];
      const optC = rowMatches[4];
      const optD = rowMatches[5];
      const correct = (rowMatches[6] || 'A').toUpperCase().trim();
      const expl = rowMatches[7] || '';

      if (!['A', 'B', 'C', 'D'].includes(correct)) continue;

      questions.push({
        id: `q_csv_${Date.now()}_${i}`,
        questionNumber: qNum,
        questionText: qText,
        options: {
          A: optA,
          B: optB,
          C: optC,
          D: optD,
        },
        correctOption: correct as 'A' | 'B' | 'C' | 'D',
        explanation: expl,
        points: 5,
      });
    }

    if (questions.length === 0) {
      return { questions: [], error: 'No valid questions could be parsed from the CSV file.' };
    }

    return { questions };
  };

  const createQuizFromCsv = async (
    params: CreateQuizFromCsvParams
  ): Promise<{ success: boolean; error?: string; quiz?: Quiz }> => {
    const { questions, error } = parseQuizCsv(params.csvContent);

    if (error || questions.length === 0) {
      return { success: false, error: error || 'Failed to parse questions.' };
    }

    const totalPoints = questions.reduce((acc, q) => acc + q.points, 0);

    const newQuiz: Quiz = {
      id: `quiz_${Date.now()}`,
      title: params.title.trim(),
      courseCode: params.courseCode,
      courseName: params.courseName,
      timeLimitMinutes: params.timeLimitMinutes,
      passingPercentage: params.passingPercentage,
      totalPoints,
      description: params.description?.trim() || `Quiz consisting of ${questions.length} questions.`,
      questions,
      createdAt: 'Just now',
      status: 'Published',
      totalAttempts: 0,
      avgScore: 0,
      passRate: 0,
    };

    await addQuiz(newQuiz);
    return { success: true, quiz: newQuiz };
  };

  const submitQuizAttempt = async (
    attemptData: Omit<StudentQuizAttempt, 'id' | 'completedAt'>
  ): Promise<StudentQuizAttempt> => {
    const tempId = `att_${Date.now()}`;
    const newAttempt: StudentQuizAttempt = {
      ...attemptData,
      id: tempId,
      completedAt: 'Just now',
    };

    setAttempts((prev) => [newAttempt, ...prev]);

    if (isSupabaseConfigured) {
      try {
        const { data: dbRow } = await supabase
          .from('QuizAttempt')
          .insert({
            quizId: attemptData.quizId,
            studentEmail: attemptData.studentEmail,
            studentName: attemptData.studentName,
            score: attemptData.score,
            totalQuestions: Math.round(attemptData.totalPoints / 5) || 10,
            correctCount: Math.round(attemptData.pointsScored / 5) || 8,
            passed: attemptData.passed,
            timeSpentSeconds: attemptData.timeSpentSeconds || 0,
          })
          .select()
          .single();

        if (dbRow) {
          const persisted: StudentQuizAttempt = {
            ...newAttempt,
            id: dbRow.id,
            completedAt: 'Just now',
          };
          setAttempts((prev) => prev.map((a) => (a.id === tempId ? persisted : a)));
          return persisted;
        }
      } catch (err) {
        console.error('Error persisting quiz attempt to DB:', err);
      }
    }

    return newAttempt;
  };

  const deleteQuiz = async (quizId: string) => {
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    setAttempts((prev) => prev.filter((a) => a.quizId !== quizId));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('QuizQuestion').delete().eq('quizId', quizId);
        await supabase.from('QuizAttempt').delete().eq('quizId', quizId);
        await supabase.from('Quiz').delete().eq('id', quizId);
      } catch (err) {
        console.error('Error deleting Quiz from DB:', err);
      }
    }
  };

  const getAttemptsByQuiz = (quizId: string) => {
    return attempts.filter((a) => a.quizId === quizId);
  };

  const getAttemptsByStudent = (studentEmail: string) => {
    if (!studentEmail || !studentEmail.trim()) return [];
    return attempts.filter(
      (a) => a.studentEmail && a.studentEmail.toLowerCase() === studentEmail.toLowerCase().trim()
    );
  };

  const getQuizById = (quizId: string) => {
    return quizzes.find((q) => q.id === quizId);
  };

  return (
    <TestContext.Provider
      value={{
        quizzes,
        attempts,
        stats,
        isLoading,
        addQuiz,
        createQuizFromCsv,
        submitQuizAttempt,
        deleteQuiz,
        getAttemptsByQuiz,
        getAttemptsByStudent,
        getQuizById,
        refreshQuizzes: fetchQuizzesFromDb,
      }}
    >
      {children}
    </TestContext.Provider>
  );
};

export const useTests = () => {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTests must be used within a TestProvider');
  }
  return context;
};
