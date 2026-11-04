-- ==============================================================================
-- AIvalytics LMS - Hardened Row Level Security (RLS) & Access Control
-- Designed according to Supabase & Cloudflare Security Audit standards.
-- ==============================================================================

-- 1. Schema Grants: Restrict 'anon' role from having unchecked write privileges
REVOKE ALL ON SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Grant minimal usage to anon and authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON "public"."Course", "public"."CourseModule", "public"."Lesson", "public"."Certificate" TO anon;

-- Authenticated write grants (controlled strictly by RLS policies below)
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 2. Helper function to check if caller has ADMIN role (Security Definer)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "public"."User"
    WHERE email = (auth.jwt() ->> 'email')
    AND role = 'ADMIN'
  );
$$;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM "public"."User"
  WHERE email = (auth.jwt() ->> 'email')
  LIMIT 1;
$$;

-- ==============================================================================
-- 3. ENABLE RLS ON ALL PUBLIC TABLES
-- ==============================================================================
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CourseModule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."UserLessonProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ClassSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Certificate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Quiz" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."QuizQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."QuizAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProjectModule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProjectSubpart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProjectSubmission" ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. POLICIES: User Table
-- ==============================================================================
DROP POLICY IF EXISTS "Users can read own or admin reads all" ON "public"."User";
DROP POLICY IF EXISTS "Users can read their own profile" ON "public"."User";
CREATE POLICY "Users can read own or admin reads all"
ON "public"."User"
FOR SELECT
USING (auth.jwt() ->> 'email' = email OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."User";
DROP POLICY IF EXISTS "Users update own profile or admin updates" ON "public"."User";
CREATE POLICY "Users update own profile or admin updates"
ON "public"."User"
FOR UPDATE
USING (auth.jwt() ->> 'email' = email OR public.is_admin());

-- ==============================================================================
-- 5. POLICIES: Course Content (Course, CourseModule, Lesson)
-- ==============================================================================
DROP POLICY IF EXISTS "Anyone can view courses" ON "public"."Course";
CREATE POLICY "Anyone can view courses"
ON "public"."Course" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin can modify courses" ON "public"."Course";
CREATE POLICY "Only admin can modify courses"
ON "public"."Course" FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view course modules" ON "public"."CourseModule";
CREATE POLICY "Anyone can view course modules"
ON "public"."CourseModule" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin can modify course modules" ON "public"."CourseModule";
CREATE POLICY "Only admin can modify course modules"
ON "public"."CourseModule" FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view lessons" ON "public"."Lesson";
CREATE POLICY "Anyone can view lessons"
ON "public"."Lesson" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin can modify lessons" ON "public"."Lesson";
CREATE POLICY "Only admin can modify lessons"
ON "public"."Lesson" FOR ALL USING (public.is_admin());

-- ==============================================================================
-- 6. POLICIES: User Lesson Progress
-- ==============================================================================
DROP POLICY IF EXISTS "Users view and manage own lesson progress" ON "public"."UserLessonProgress";
CREATE POLICY "Users view and manage own lesson progress"
ON "public"."UserLessonProgress"
FOR ALL
USING ("userId" = public.current_user_id() OR public.is_admin())
WITH CHECK ("userId" = public.current_user_id() OR public.is_admin());

-- ==============================================================================
-- 7. POLICIES: Class Sessions & Attendance
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users view sessions" ON "public"."ClassSession";
CREATE POLICY "Authenticated users view sessions"
ON "public"."ClassSession" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin can modify sessions" ON "public"."ClassSession";
CREATE POLICY "Only admin can modify sessions"
ON "public"."ClassSession" FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users view own attendance or admin views all" ON "public"."AttendanceRecord";
CREATE POLICY "Users view own attendance or admin views all"
ON "public"."AttendanceRecord"
FOR SELECT
USING ("userId" = public.current_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "Only admin can mutate attendance" ON "public"."AttendanceRecord";
CREATE POLICY "Only admin can mutate attendance"
ON "public"."AttendanceRecord"
FOR ALL
USING (public.is_admin());

-- ==============================================================================
-- 8. POLICIES: Enrollments
-- ==============================================================================
DROP POLICY IF EXISTS "Users view own enrollments or admin views all" ON "public"."Enrollment";
CREATE POLICY "Users view own enrollments or admin views all"
ON "public"."Enrollment"
FOR SELECT
USING ("userId" = public.current_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "Only admin can modify enrollments" ON "public"."Enrollment";
CREATE POLICY "Only admin can modify enrollments"
ON "public"."Enrollment"
FOR ALL
USING (public.is_admin());

-- ==============================================================================
-- 9. POLICIES: Support Tickets
-- ==============================================================================
DROP POLICY IF EXISTS "Users view own tickets or admin views all" ON "public"."SupportTicket";
CREATE POLICY "Users view own tickets or admin views all"
ON "public"."SupportTicket"
FOR SELECT
USING ("studentEmail" = (auth.jwt() ->> 'email') OR public.is_admin());

DROP POLICY IF EXISTS "Users create own tickets" ON "public"."SupportTicket";
CREATE POLICY "Users create own tickets"
ON "public"."SupportTicket"
FOR INSERT
WITH CHECK ("studentEmail" = (auth.jwt() ->> 'email') OR public.is_admin());

DROP POLICY IF EXISTS "Users update own tickets or admin updates" ON "public"."SupportTicket";
CREATE POLICY "Users update own tickets or admin updates"
ON "public"."SupportTicket"
FOR UPDATE
USING ("studentEmail" = (auth.jwt() ->> 'email') OR public.is_admin());

-- ==============================================================================
-- 10. POLICIES: Quizzes & Attempts
-- ==============================================================================
DROP POLICY IF EXISTS "Users view quizzes" ON "public"."Quiz";
CREATE POLICY "Users view quizzes"
ON "public"."Quiz" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users view quiz questions" ON "public"."QuizQuestion";
CREATE POLICY "Users view quiz questions"
ON "public"."QuizQuestion" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users view own quiz attempts or admin views all" ON "public"."QuizAttempt";
CREATE POLICY "Users view own quiz attempts or admin views all"
ON "public"."QuizAttempt"
FOR SELECT
USING ("studentEmail" = (auth.jwt() ->> 'email') OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own quiz attempt" ON "public"."QuizAttempt";
CREATE POLICY "Users can insert own quiz attempt"
ON "public"."QuizAttempt"
FOR INSERT
WITH CHECK ("studentEmail" = (auth.jwt() ->> 'email') OR public.is_admin());

-- ==============================================================================
-- 11. POLICIES: Project Modules, Subparts & Submissions
-- ==============================================================================
DROP POLICY IF EXISTS "Anyone views project modules" ON "public"."ProjectModule";
CREATE POLICY "Anyone views project modules"
ON "public"."ProjectModule" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone views project subparts" ON "public"."ProjectSubpart";
CREATE POLICY "Anyone views project subparts"
ON "public"."ProjectSubpart" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users view own submissions or admin views all" ON "public"."ProjectSubmission";
CREATE POLICY "Users view own submissions or admin views all"
ON "public"."ProjectSubmission"
FOR SELECT
USING ("studentEmail" = (auth.jwt() ->> 'email') OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own submissions" ON "public"."ProjectSubmission";
CREATE POLICY "Users insert own submissions"
ON "public"."ProjectSubmission"
FOR INSERT
WITH CHECK ("studentEmail" = (auth.jwt() ->> 'email') OR public.is_admin());

DROP POLICY IF EXISTS "Users update own submissions or admin evaluates" ON "public"."ProjectSubmission";
CREATE POLICY "Users update own submissions or admin evaluates"
ON "public"."ProjectSubmission"
FOR UPDATE
USING ("studentEmail" = (auth.jwt() ->> 'email') OR public.is_admin());
