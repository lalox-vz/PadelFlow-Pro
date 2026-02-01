-- ================================================
-- CRITICAL FIX: booking_logs Foreign Key & RLS
-- ================================================

-- ================================================
-- STEP 1: Fix Foreign Key Relationship
-- ================================================

-- Drop all existing foreign key constraints
ALTER TABLE public.booking_logs 
DROP CONSTRAINT IF EXISTS fk_booking_logs_user CASCADE;

ALTER TABLE public.booking_logs 
DROP CONSTRAINT IF EXISTS booking_logs_user_id_fkey CASCADE;

-- Add the foreign key constraint properly
ALTER TABLE public.booking_logs 
ADD CONSTRAINT booking_logs_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE SET NULL;

-- Verify FK exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'booking_logs_user_id_fkey'
        AND table_name = 'booking_logs'
    ) THEN
        RAISE NOTICE '✅ Foreign key booking_logs -> users created';
    ELSE
        RAISE EXCEPTION '❌ Failed to create foreign key';
    END IF;
END $$;

-- ================================================
-- STEP 2: Grant Permissions
-- ================================================

GRANT SELECT ON public.users TO authenticated;
GRANT SELECT, INSERT ON public.booking_logs TO authenticated;

-- ================================================
-- STEP 3: Fix RLS Policies
-- ================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "platform_admins_view_all_logs" ON public.booking_logs;
DROP POLICY IF EXISTS "org_users_view_org_logs" ON public.booking_logs;
DROP POLICY IF EXISTS "authenticated_users_insert_logs" ON public.booking_logs;
DROP POLICY IF EXISTS "allow_authenticated_insert_logs" ON public.booking_logs;
DROP POLICY IF EXISTS "allow_org_users_select_logs" ON public.booking_logs;
DROP POLICY IF EXISTS "Permitir inserción a usuarios autenticados" ON public.booking_logs;
DROP POLICY IF EXISTS "Permitir ver logs de su propia organización" ON public.booking_logs;

-- Ensure RLS is enabled
ALTER TABLE public.booking_logs ENABLE ROW LEVEL SECURITY;

-- ================================================
-- POLICY 1: INSERT - Any authenticated user
-- ================================================
CREATE POLICY "allow_insert_logs" 
ON public.booking_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- ================================================
-- POLICY 2: SELECT - Organization members and platform admins
-- ================================================
CREATE POLICY "allow_select_logs" 
ON public.booking_logs 
FOR SELECT 
TO authenticated 
USING (
    -- Platform admins can see all logs
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'platform_admin'
    )
    OR
    -- Organization members can see their org's logs
    EXISTS (
        SELECT 1 
        FROM public.bookings b
        INNER JOIN public.users u ON u.id = auth.uid()
        WHERE b.id = booking_logs.booking_id 
        AND b.entity_id = u.organization_id
    )
);

-- ================================================
-- STEP 4: Verify Everything Works
-- ================================================

DO $$
DECLARE
    fk_count INT;
    insert_policy_count INT;
    select_policy_count INT;
BEGIN
    -- Check FK
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'booking_logs_user_id_fkey'
    AND table_name = 'booking_logs';
    
    -- Check INSERT policy
    SELECT COUNT(*) INTO insert_policy_count
    FROM pg_policies 
    WHERE tablename = 'booking_logs' 
    AND policyname = 'allow_insert_logs';
    
    -- Check SELECT policy
    SELECT COUNT(*) INTO select_policy_count
    FROM pg_policies 
    WHERE tablename = 'booking_logs' 
    AND policyname = 'allow_select_logs';
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'VERIFICATION RESULTS:';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Foreign Key (booking_logs -> users): %', CASE WHEN fk_count > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'INSERT Policy: %', CASE WHEN insert_policy_count > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'SELECT Policy: %', CASE WHEN select_policy_count > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '====================================';
    
    IF fk_count = 0 OR insert_policy_count = 0 OR select_policy_count = 0 THEN
        RAISE EXCEPTION '❌ Setup incomplete - check logs above';
    ELSE
        RAISE NOTICE '✅ ALL CHECKS PASSED - Activity history should work!';
    END IF;
END $$;

-- ================================================
-- STEP 5: Add indexes for performance
-- ================================================

CREATE INDEX IF NOT EXISTS idx_booking_logs_user_id ON public.booking_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_logs_booking_id ON public.booking_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_logs_created_at ON public.booking_logs(created_at DESC);

COMMENT ON CONSTRAINT booking_logs_user_id_fkey ON public.booking_logs IS 
    'Links booking logs to users table - enables join queries for activity history';
