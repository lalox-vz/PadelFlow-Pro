-- FIX INFINITE RECURSION IN USERS POLICY (REVISED)

-- Case: Policies might already exist, so we drop them explicitly before creating.

-- 1. Drop ALL existing policies for clean slate
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;

-- 2. CREATE SIMPLIFIED POLICIES (Non-Recursive)

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Allow users to insert their own profile (often handled by triggers, but good for completeness in some auth flows)
CREATE POLICY "Users can insert own profile" 
ON public.users 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
