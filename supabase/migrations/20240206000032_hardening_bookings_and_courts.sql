-- MIGRATION: DATABASE HARDENING V2 (FIXED)
-- 1. Convert bookings.court_id to UUID (Fix Type Mismatch)
-- 2. Add member_id to bookings (The Missing Link)
-- 3. Remove Cascade Delete from bookings.court_id (The Financial Shield)

BEGIN;

-- STAGE 0: FIX TYPE MISMATCH (TEXT -> UUID)
-- This is required because legacy bookings stores court_id as text, but courts.id is uuid.
-- We cast it. If this fails, it means there are non-UUID values in the column that need manual cleanup.
ALTER TABLE public.bookings 
ALTER COLUMN court_id TYPE uuid USING court_id::uuid;

-- STAGE 1: ADD MEMBER_ID
-- We use SET NULL so if a member is deleted, the financial record (booking) remains but unlinked.
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.club_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_member_id ON public.bookings(member_id);

-- STAGE 2: PREVENT FINANCIAL SUICIDE (COURT DELETION)
-- Check if the constraint exists and drop it to recreate it with RESTRICT
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
    AND confrelid = 'public.courts'::regclass
    AND contype = 'f';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Re-add constraint with RESTRICT (DB will reject deleting a court if it has bookings)
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_court_id_fkey 
FOREIGN KEY (court_id) 
REFERENCES public.courts(id) 
ON DELETE RESTRICT;

COMMIT;
