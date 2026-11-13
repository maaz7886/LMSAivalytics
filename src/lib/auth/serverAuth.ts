import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface VerifiedAuthResult {
  authorized: boolean;
  status: number;
  error?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Server-side authorization verification for Admin API routes.
 * Validates the caller's Bearer JWT using Supabase Auth and ensures
 * their account holds the ADMIN role in the database.
 */
export async function verifyAdminRequest(req: NextRequest): Promise<VerifiedAuthResult> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return {
      authorized: false,
      status: 401,
      error: 'Unauthorized: Authentication required. Bearer token missing.',
    };
  }

  // If Supabase Admin is configured, perform cryptographic JWT validation
  if (supabaseAdmin) {
    try {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !authData?.user) {
        return {
          authorized: false,
          status: 401,
          error: `Unauthorized: Invalid or expired authentication token. ${authErr?.message || ''}`.trim(),
        };
      }

      const email = authData.user.email?.toLowerCase().trim();
      if (!email) {
        return {
          authorized: false,
          status: 401,
          error: 'Unauthorized: User record has no valid email.',
        };
      }

      // Verify the user's role from the database
      const dbUser = await prisma.user.findFirst({
        where: { email },
        select: { id: true, email: true, role: true },
      });

      if (!dbUser || dbUser.role !== 'ADMIN') {
        return {
          authorized: false,
          status: 403,
          error: 'Forbidden: Admin privilege required to perform this action.',
        };
      }

      return {
        authorized: true,
        status: 200,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Auth verification error';
      return {
        authorized: false,
        status: 500,
        error: `Internal authentication verification error: ${message}`,
      };
    }
  }

  return {
    authorized: false,
    status: 503,
    error: 'Authentication service unavailable: Supabase admin is not configured.',
  };
}

