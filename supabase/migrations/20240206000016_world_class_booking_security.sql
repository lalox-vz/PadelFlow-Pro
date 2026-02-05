-- 1. ADD METADATA COLUMN TO BOOKINGS
-- This column will store audit logs (created_by, ip, source) and context data (contact_mismatch).
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. USER SYNC TRIGGER (As requested in Step 3)
-- Ensures that when a User updates their OWN profile (phone/email/name) in 'public.users',
-- this freshness propagates to all their 'club_members' entities automatically.

CREATE OR REPLACE FUNCTION public.sync_user_to_club_members()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if critical fields changed
    IF (NEW.phone IS DISTINCT FROM OLD.phone) OR 
       (NEW.raw_user_meta_data->>'full_name' IS DISTINCT FROM OLD.raw_user_meta_data->>'full_name') OR 
       (NEW.email IS DISTINCT FROM OLD.email) THEN
       
       -- Propagate to all club memberships
       UPDATE public.club_members
       SET 
         phone = COALESCE(NEW.phone, phone),
         full_name = COALESCE((NEW.raw_user_meta_data->>'full_name')::text, full_name),
         email = NEW.email,
         updated_at = NOW()
       WHERE user_id = NEW.id;
       
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop check to ensure clean slate
DROP TRIGGER IF EXISTS on_user_update_sync_members ON public.users;

-- Bind Trigger
CREATE TRIGGER on_user_update_sync_members
AFTER UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_to_club_members();
