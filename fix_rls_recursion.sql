-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert trainings" ON public.trainings;
DROP POLICY IF EXISTS "Admins can update trainings" ON public.trainings;
DROP POLICY IF EXISTS "Admins can delete trainings" ON public.trainings;
DROP POLICY IF EXISTS "Admins can manage trainings" ON public.trainings; -- Added this line

-- Fix USERS policies to use auth.jwt() to avoid recursion
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR
  auth.uid() = id
);

CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "Admins can update users"
ON public.users
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR
  auth.uid() = id
);

-- Fix TRAININGS policies (Admins full access, Clients read-only)
CREATE POLICY "Admins can manage trainings"
ON public.trainings
FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "Clients can view trainings"
ON public.trainings
FOR SELECT
TO authenticated
USING (true);

-- Fix NOTIFICATIONS policies (Admins view all)
DROP POLICY IF EXISTS "Admins can view notifications" ON public.notifications;

CREATE POLICY "Admins can view notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "Admins can update notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
