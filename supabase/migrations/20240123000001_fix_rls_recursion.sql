-- FIX RLS RECURSION ON USERS TABLE
-- This script drops all existing policies on the users table and recreates them 
-- using simple, non-recursive checks (auth.uid() = id).

-- 1. DROP ALL EXISTING POLICIES (to clear the conflict)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Public can view coaches" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

-- 2. CREATE SIMPLE, SAFE POLICIES
--    These strictly compare auth.uid() to the row's id column.
--    They do NOT query the table itself, preventing recursion.

-- SELECT: Users can see their own data
CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- UPDATE: Users can update ONLY their own data
CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- INSERT: Users can insert their own row (critical for signup/onboarding triggers)
CREATE POLICY "Users can insert their own profile" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 3. ENSURE ALL COLUMNS EXIST (Just in case)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'has_business') THEN
        ALTER TABLE public.users ADD COLUMN has_business BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_type') THEN
        ALTER TABLE public.users ADD COLUMN business_type TEXT CHECK (business_type IN ('club', 'academy'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'onboarding_status') THEN
        ALTER TABLE public.users ADD COLUMN onboarding_status TEXT DEFAULT 'not_started';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'onboarding_step') THEN
        ALTER TABLE public.users ADD COLUMN onboarding_step INT DEFAULT 1;
    END IF;
END $$;

-- 4. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
