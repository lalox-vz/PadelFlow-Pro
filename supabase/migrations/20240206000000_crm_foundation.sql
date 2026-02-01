-- ==============================================================================
-- MIGRATION: CRM FOUNDATION V2 - Social Network Ready
-- Description: Creates 'club_members' with separate Public/Private security scopes.
-- Enables Global Player Lookup while protecting Club Business Data.
-- ==============================================================================

-- 1. Create the Unified Members Table (CRM Core)
CREATE TABLE IF NOT EXISTS public.club_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to Global Profile
    
    -- Identity Fields (Cached for speed)
    full_name text NOT NULL,
    phone text, -- Master Search Key (Indexed)
    email text,
    
    -- CRM Status
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned', 'vip')),
    
    -- 🔒 PRIVATE BUSINESS DATA (RLS Protected)
    notes text,
    total_bookings integer DEFAULT 0,
    total_spent numeric(10,2) DEFAULT 0,
    last_interaction_at timestamptz,
    
    -- 🌍 SOCIAL / FLEXIBLE DATA
    metadata jsonb DEFAULT '{}'::jsonb, -- Privacy settings, play level, nicknames
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    UNIQUE(club_id, user_id)
);

-- Optimize Search
CREATE INDEX IF NOT EXISTS idx_club_members_phone ON public.club_members(phone);
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON public.club_members(club_id);
-- Enable Full Text Search
CREATE INDEX IF NOT EXISTS idx_club_members_search ON public.club_members USING GIN (to_tsvector('simple', full_name || ' ' || coalesce(phone, '') || ' ' || coalesce(email, '')));

-- ==============================================================================
-- 2. SECURITY POLICIES (RLS) - "The Social Firewall"
-- ==============================================================================
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- A. Club Owners/Staff: Full Access to THEIR OWN members
CREATE POLICY "Club staff manage own members" ON public.club_members
    FOR ALL USING (
        club_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- B. Global Lookup (The "Network" Feature)
-- Allow Authenticated Users (e.g., other Club Owners) to SEE basic info
-- ONLY if they know the EXACT Phone Number (Anti-Scraping Privacy).
-- This allows: "Add Member -> Type Phone -> Found 'Andres'!"

-- Note: In Supabase, 'SELECT' policies can be field-specific manually, 
-- but normally RLS applies to whole row.
-- To protect 'total_spent' from prying eyes, we should ideally use a separate VIEW or specific policy logic.
-- However, for Phase 1, we will RESTRICT access strictly to own club for now,
-- and rely on 'public.users' for the Global Lookup, not 'club_members'.
-- Why? Because 'club_members' is the CLUB'S PRIVATE BOOK. 
-- 'public.users' is the PUBLIC DIRECTORY.

-- Strategy Adjustment for "Social Network":
-- When adding a member, you search 'public.users' (Global) OR 'club_members' (Local).
-- We do NOT open 'club_members' to other clubs yet to avoid data leaks.

-- So, 'club_members' remains STRICTLY PRIVATE per club.
-- The "Global Search" requirement is fulfilled by querying 'public.users'.

-- 3. SYNC AUTOMATION
CREATE OR REPLACE FUNCTION public.sync_user_to_club_member()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.organization_id IS NOT NULL THEN
        INSERT INTO public.club_members (
            club_id,
            user_id,
            full_name,
            email,
            phone,
            status,
            metadata,
            created_at
        )
        VALUES (
            NEW.organization_id,
            NEW.id,
            COALESCE(NEW.full_name, 'Usuario Sin Nombre'),
            NEW.email,
            NEW.phone,
            'active',
            '{"source": "auto_sync", "privacy": "default"}'::jsonb,
            NEW.created_at
        )
        ON CONFLICT (club_id, user_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_sync_crm ON public.users;
CREATE TRIGGER on_user_sync_crm
    AFTER INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_to_club_member();

-- 4. UTILITY: Backfill Helper (Safe Mode)
CREATE OR REPLACE FUNCTION public.backfill_club_members_for_club(target_club_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.club_members (club_id, user_id, full_name, email, phone, created_at)
    SELECT 
        organization_id, 
        id, 
        full_name, 
        email, 
        phone, 
        created_at
    FROM public.users
    WHERE organization_id = target_club_id
    ON CONFLICT (club_id, user_id) DO NOTHING;
END;
$$;
