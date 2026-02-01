-- NUCLEAR FIX FOR "INFINITE RECURSION" ON USERS TABLE
-- This script dynamically drops ALL RLS policies on the 'public.users' table
-- and re-creates simple, safe policies.

DO $$ 
DECLARE 
    pol record; 
BEGIN 
    -- 1. Iterate over all existing policies for the 'users' table and drop them
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP 
        RAISE NOTICE 'Dropping policy: %', pol.policyname;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname); 
    END LOOP; 
END $$;

-- 2. Force Enable RLS (just in case)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Re-create Simple, Non-Recursive Policies

-- READ: Users can see their own profile
CREATE POLICY "policy_read_own_profile" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "policy_update_own_profile" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- INSERT: Users can insert their own profile
CREATE POLICY "policy_insert_own_profile" 
ON public.users 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- 4. OPTIONAL: Allow Service Role (Server-side) full access implies bypass RLS,
-- but explicit policies for Service Role are sometimes added if using a restricted client.
-- By default, Service Role key bypasses RLS completely, so no policy needed for that.

-- Confimation
SELECT 'All users policies reset successfully' as result;
