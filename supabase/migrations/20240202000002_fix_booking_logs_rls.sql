-- ================================================
-- Fix booking_logs RLS Policies for Activity History
-- ================================================

-- First, drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "platform_admins_view_all_logs" ON public.booking_logs;
DROP POLICY IF EXISTS "org_users_view_org_logs" ON public.booking_logs;
DROP POLICY IF EXISTS "authenticated_users_insert_logs" ON public.booking_logs;

-- Ensure RLS is enabled
ALTER TABLE public.booking_logs ENABLE ROW LEVEL SECURITY;

-- ================================================
-- POLICY 1: Allow ANY authenticated user to INSERT logs
-- ================================================
-- This is critical - staff need to be able to log their actions
CREATE POLICY "allow_authenticated_insert_logs" 
ON public.booking_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- ================================================
-- POLICY 2: Allow users to SELECT logs from their organization
-- ================================================
-- Users can see logs for bookings that belong to their organization
-- Platform admins can see everything
CREATE POLICY "allow_org_users_select_logs" 
ON public.booking_logs 
FOR SELECT 
TO authenticated 
USING (
    -- Platform admins see all logs
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'platform_admin'
    OR
    -- Organization members see their org's logs
    EXISTS (
        SELECT 1 
        FROM public.bookings b
        JOIN public.users u ON u.id = auth.uid()
        WHERE b.id = booking_logs.booking_id 
        AND b.entity_id = u.organization_id
    )
);

-- ================================================
-- Verify policies were created
-- ================================================
DO $$
DECLARE
    insert_policy_count INT;
    select_policy_count INT;
BEGIN
    SELECT COUNT(*) INTO insert_policy_count
    FROM pg_policies 
    WHERE tablename = 'booking_logs' 
    AND policyname = 'allow_authenticated_insert_logs';
    
    SELECT COUNT(*) INTO select_policy_count
    FROM pg_policies 
    WHERE tablename = 'booking_logs' 
    AND policyname = 'allow_org_users_select_logs';
    
    IF insert_policy_count > 0 AND select_policy_count > 0 THEN
        RAISE NOTICE '✅ booking_logs RLS policies created successfully';
        RAISE NOTICE '   - INSERT policy: allow_authenticated_insert_logs';
        RAISE NOTICE '   - SELECT policy: allow_org_users_select_logs';
    ELSE
        RAISE EXCEPTION '❌ Failed to create one or more RLS policies';
    END IF;
END $$;

-- ================================================
-- Grant necessary permissions
-- ================================================
GRANT SELECT, INSERT ON public.booking_logs TO authenticated;

COMMENT ON POLICY "allow_authenticated_insert_logs" ON public.booking_logs IS 
    'Allows any authenticated user to insert activity logs';
    
COMMENT ON POLICY "allow_org_users_select_logs" ON public.booking_logs IS 
    'Allows users to view logs for bookings in their organization, platform admins can see all';
