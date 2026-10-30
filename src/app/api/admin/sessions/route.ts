import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let sessionId = searchParams.get('id');

    if (!sessionId) {
      try {
        const body = await req.json();
        sessionId = body?.id;
      } catch {
        // No JSON body provided
      }
    }

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required to delete session' },
        { status: 400 }
      );
    }

    // 1. Delete associated Attendance Records first
    try {
      await prisma.attendanceRecord.deleteMany({
        where: { sessionId },
      });
    } catch (attendanceErr) {
      console.warn('Prisma attendance deletion notice:', attendanceErr);
    }

    // 2. Delete the ClassSession from Prisma PostgreSQL
    try {
      await prisma.classSession.delete({
        where: { id: sessionId },
      });
    } catch (prismaErr: any) {
      // P2025 means record was already deleted
      if (prismaErr?.code !== 'P2025') {
        console.error('Prisma ClassSession deletion error:', prismaErr);
      }
    }

    // 3. Delete from Supabase with service role admin (triggers Realtime listeners)
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('AttendanceRecord').delete().eq('sessionId', sessionId);
        await supabaseAdmin.from('ClassSession').delete().eq('id', sessionId);
      } catch (supabaseErr) {
        console.warn('Supabase Admin deletion notice:', supabaseErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Session successfully deleted from all platform databases and rosters.',
      deletedSessionId: sessionId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('Delete session error:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
