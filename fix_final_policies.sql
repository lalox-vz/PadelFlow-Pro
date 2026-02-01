-- 1. FIX NOTIFICATIONS TABLE (Missing 'read' column)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;

-- 2. RESET RLS (Drop all policies to ensure clean slate)
DROP POLICY IF EXISTS "Admins can manage trainings" ON public.trainings;
DROP POLICY IF EXISTS "Admins can insert trainings" ON public.trainings;
DROP POLICY IF EXISTS "Admins can update trainings" ON public.trainings;
DROP POLICY IF EXISTS "Admins can delete trainings" ON public.trainings;
DROP POLICY IF EXISTS "Trainings are public" ON public.trainings;
DROP POLICY IF EXISTS "Clients can view trainings" ON public.trainings;

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

DROP POLICY IF EXISTS "Admins can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;

-- 3. RE-APPLY CLEAN POLICIES (Using auth.jwt() to avoid recursion)

-- USERS
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT TO authenticated USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR auth.uid() = id
);
CREATE POLICY "Admins can delete users" ON public.users FOR DELETE TO authenticated USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "Admins can update users" ON public.users FOR UPDATE TO authenticated USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR auth.uid() = id
);

-- TRAININGS
CREATE POLICY "Admins can manage trainings" ON public.trainings FOR ALL TO authenticated USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "Everyone can view trainings" ON public.trainings FOR SELECT TO authenticated USING (true);

-- NOTIFICATIONS
CREATE POLICY "Admins can view notifications" ON public.notifications FOR SELECT TO authenticated USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "Admins can update notifications" ON public.notifications FOR UPDATE TO authenticated USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 4. ENSURE RLS IS ENABLED
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
