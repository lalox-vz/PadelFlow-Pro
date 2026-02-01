-- ==========================================
-- FIX USERS RLS RECURSION (Critical for Team View)
-- ==========================================

-- 1. Create a helper function to get Org ID without triggering RLS loop
-- SECURITY DEFINER allows it to bypass row level security on the users table
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT organization_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the Policy to use the safe function
DROP POLICY IF EXISTS "org_read_access" ON public.users;

CREATE POLICY "org_read_access" ON public.users
    FOR SELECT
    USING (
        organization_id = public.get_my_org_id()
    );

-- Validate permissions on the function (public execution is fine as it uses auth.uid)
GRANT EXECUTE ON FUNCTION public.get_my_org_id TO authenticated;
