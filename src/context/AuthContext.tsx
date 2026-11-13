'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => Promise<void> | void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Resolve user role from the Prisma User table (source of truth)
async function resolveUserFromDb(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<User | null> {
  const email = authUser.email || '';

  try {
    // Query the User table for this auth user's profile & role
    const { data: dbUser, error } = await supabase
      .from('User')
      .select('id, email, fullName, role, avatarUrl, term, phone, location, cohort, bio, headline, department')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!error && dbUser) {
      // Map Prisma Role enum (ADMIN/LEARNER/INSTRUCTOR) to app UserRole (admin/learner)
      const appRole: UserRole = dbUser.role === 'ADMIN' ? 'admin' : 'learner';
      const fullName = dbUser.fullName || email.split('@')[0] || 'User';
      const initials = fullName
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      return {
        id: dbUser.id,
        name: fullName,
        email: dbUser.email,
        initials: initials || 'U',
        role: appRole,
        avatar: dbUser.avatarUrl || undefined,
        term: dbUser.term || undefined,
        phone: dbUser.phone || undefined,
        location: dbUser.location || undefined,
        cohort: dbUser.cohort || undefined,
        bio: dbUser.bio || undefined,
        headline: dbUser.headline || undefined,
        department: dbUser.department || undefined,
      };
    }
  } catch (err) {
    console.error('Failed to resolve user from DB:', err);
  }

  // Fallback: user exists in Supabase Auth but NOT in User table.
  // Create a minimal profile from auth metadata.
  const fullName =
    (authUser.user_metadata?.full_name as string) || email.split('@')[0] || 'User';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return {
    id: authUser.id,
    name: fullName,
    email,
    initials: initials || 'U',
    role: 'learner', // Default to learner — admin access requires DB-level role assignment
    term: undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Start with null on both server and client to guarantee identical initial SSR render tree
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Sync user state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('aivalytics_active_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('aivalytics_active_user');
      }
    }
  }, [user]);

  useEffect(() => {
    // Immediately read cached user from localStorage on client mount
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('aivalytics_active_user');
        if (saved) {
          setUser(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Error loading saved user from localStorage', err);
      }
    }

    async function initSupabaseSession() {
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        // Query live Supabase Auth session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Supabase session retrieval error:', error.message);
          setUser(null);
        } else if (session?.user) {
          const resolved = await resolveUserFromDb(session.user);
          setUser(resolved);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to initialize Supabase session:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initSupabaseSession();

    // Subscribe to live Supabase Auth state changes (sign in, sign out, token refresh)
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (session?.user) {
            const resolved = await resolveUserFromDb(session.user);
            setUser(resolved);
          } else {
            setUser(null);
          }
          setIsLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Pure Supabase Auth signInWithPassword
  const signIn = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase Auth service is not configured.' };
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || '',
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const resolved = await resolveUserFromDb(data.user);
        setUser(resolved);
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  const signUp = async (
    _email: string,
    _password: string,
    _name: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Registration process kept aside as requested
    return { success: false, error: 'Registration is currently invitation-only. Please sign in.' };
  };

  // Pure Supabase Auth signOut
  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase signOut error:', err);
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aivalytics_active_user');
    }
    setUser(null);
    router.replace('/login');
  };

  const updateUser = async (updatedData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedData };
      if (updatedData.name) {
        const initials = updatedData.name
          .trim()
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        updated.initials = initials || prev.initials;
      }
      return updated;
    });

    if (user?.id && isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, unknown> = {};
        if (updatedData.name !== undefined) payload.fullName = updatedData.name;
        if (updatedData.phone !== undefined) payload.phone = updatedData.phone;
        if (updatedData.location !== undefined) payload.location = updatedData.location;
        if (updatedData.headline !== undefined) payload.headline = updatedData.headline;
        if (updatedData.bio !== undefined) payload.bio = updatedData.bio;
        if (updatedData.department !== undefined) payload.department = updatedData.department;
        if (updatedData.cohort !== undefined) payload.cohort = updatedData.cohort;

        if (Object.keys(payload).length > 0) {
          payload.updatedAt = new Date().toISOString();
          await supabase.from('User').update(payload).eq('id', user.id);
        }
      } catch (err) {
        console.error('Error persisting profile update to Supabase:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'learner',
        isAuthenticated: Boolean(user),
        isLoading,
        signIn,
        signUp,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
