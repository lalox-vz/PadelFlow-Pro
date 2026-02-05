-- EMERGENCY FIX: Club Members RLS Policies
-- This migration secures the 'club_members' table to prevent 403 Forbidden errors and "Black Screen" crashes.

-- 1. Enable Row Level Security (Safety First)
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- 2. Policy: VIEW (SELECT)
-- Club Owners and Staff can see members belonging to their organization (entity_id)
CREATE POLICY "Users can view members of their club"
ON public.club_members
FOR SELECT
USING (
    -- Direct check against the organization_id in the user's metadata or logic
    -- Optimised for PadelFlow tenancy model
    entity_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- 3. Policy: MANAGE (INSERT, UPDATE)
-- Club Owners can create and edit members in their organization
CREATE POLICY "Users can manage members of their club"
ON public.club_members
FOR ALL -- Covers I/U/D
USING (
    entity_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
)
WITH CHECK (
    entity_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- 4. Explicit Public Read (Optional/Temporary Debug)
-- If we were strictly public for testing, we would use 'true', but here we stick to tenant security.
