-- Grant basic schema access to Supabase client roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Enable RLS and create policies matching the AuthContext queries
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read their own profile" ON "public"."User";
CREATE POLICY "Users can read their own profile" 
ON "public"."User" 
FOR SELECT 
USING (auth.jwt() ->> 'email' = email);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."User";
CREATE POLICY "Users can update their own profile" 
ON "public"."User" 
FOR UPDATE 
USING (auth.jwt() ->> 'email' = email);
