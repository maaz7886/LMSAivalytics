import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface ImportStudentPayload {
  id?: string;
  fullName: string;
  email: string;
  password?: string;
  courseCode?: string;
  courseName?: string;
  term?: string;
  status?: 'Active' | 'Pending';
  enrolledAt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const students: ImportStudentPayload[] = body.students || [];

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No students provided for bulk import' },
        { status: 400 }
      );
    }

    // 1. Get or fallback to Flagship Course (AINPM-101)
    let flagshipCourse = await prisma.course.findFirst({
      where: { code: 'AINPM-101' },
    });

    if (!flagshipCourse) {
      flagshipCourse = await prisma.course.findFirst();
    }

    if (!flagshipCourse) {
      return NextResponse.json(
        { success: false, error: 'No active course found to enroll students into' },
        { status: 500 }
      );
    }

    // Cache all courses for quick lookup by code
    const allCourses = await prisma.course.findMany();
    const courseMap = new Map(allCourses.map((c) => [c.code.toUpperCase(), c]));

    // Pre-fetch auth users if supabaseAdmin is available
    let authUsersList: Array<{ id: string; email?: string }> = [];
    if (supabaseAdmin) {
      try {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          perPage: 1000,
        });
        if (!listError && listData?.users) {
          authUsersList = listData.users;
        }
      } catch (authListErr) {
        console.warn('Could not list auth users:', authListErr);
      }
    }

    const BATCH_SIZE = 10;
    const results = [];

    // Process students in batches of 10 concurrently to prevent 504 timeouts on serverless runtimes
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const chunk = students.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        chunk.map(async (student) => {
          const email = student.email.toLowerCase().trim();
          const fullName = student.fullName?.trim() || 'Learner';
          const password = student.password?.trim() || 'password123';
          const term = student.term || 'Fall 2026';
          const status = student.status === 'Pending' ? 'Pending' : 'Active';

          // Determine course
          const targetCode = (student.courseCode || 'AINPM-101').toUpperCase();
          const course = courseMap.get(targetCode) || flagshipCourse;

          let authUserId: string | null = null;

          // 2. Register / Update user in Supabase Auth (auth.users)
          if (supabaseAdmin) {
            try {
              const existingAuth = authUsersList.find(
                (u) => u.email?.toLowerCase().trim() === email
              );

              if (existingAuth) {
                authUserId = existingAuth.id;
                await supabaseAdmin.auth.admin.updateUserById(authUserId, {
                  password,
                  email_confirm: true,
                  user_metadata: { full_name: fullName },
                });
              } else {
                const { data: createdAuth, error: createAuthError } =
                  await supabaseAdmin.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { full_name: fullName },
                  });

                if (!createAuthError && createdAuth?.user) {
                  authUserId = createdAuth.user.id;
                } else if (createAuthError?.message?.includes('already been registered')) {
                  // User already in auth.users, try to find
                  const { data: singleList } = await supabaseAdmin.auth.admin.listUsers();
                  const found = singleList?.users.find(
                    (u) => u.email?.toLowerCase().trim() === email
                  );
                  if (found) {
                    authUserId = found.id;
                    await supabaseAdmin.auth.admin.updateUserById(authUserId, {
                      password,
                      email_confirm: true,
                      user_metadata: { full_name: fullName },
                    });
                  }
                } else {
                  console.error(`Failed to create auth user for ${email}:`, createAuthError?.message);
                }
              }
            } catch (authErr) {
              console.error(`Error in Supabase Auth for ${email}:`, authErr);
            }
          }

          // 3. Upsert User in PostgreSQL (public.User)
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          let dbUserId = existingUser?.id;

          if (existingUser) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                fullName,
                role: 'LEARNER',
                term,
                password,
              },
            });
          } else {
            const createdUser = await prisma.user.create({
              data: {
                ...(authUserId ? { id: authUserId } : {}),
                email,
                fullName,
                role: 'LEARNER',
                term,
                password,
              },
            });
            dbUserId = createdUser.id;
          }

          // 4. Upsert Enrollment in PostgreSQL (public.Enrollment)
          if (dbUserId && course) {
            const enrollment = await prisma.enrollment.upsert({
              where: {
                userId_courseId: {
                  userId: dbUserId,
                  courseId: course.id,
                },
              },
              update: {
                status,
              },
              create: {
                userId: dbUserId,
                courseId: course.id,
                status,
                progress: 0.0,
              },
            });

            return {
              id: dbUserId,
              enrollmentId: enrollment.id,
              fullName,
              email,
              password,
              courseCode: course.code,
              courseName: course.title,
              term,
              status,
            };
          }

          return null;
        })
      );

      for (const result of batchResults) {
        if (result) {
          results.push(result);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      students: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('Bulk import error:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
