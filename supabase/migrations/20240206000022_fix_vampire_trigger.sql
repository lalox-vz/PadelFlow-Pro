-- CRITICAL FIX: The previous version of this function incorrectly referenced 'raw_user_meta_data' 
-- on the public.users table trigger. public.users does NOT have this column; it has 'full_name'.
-- This caused the 'record "new" has no field "raw_user_meta_data"' error on any user update.

CREATE OR REPLACE FUNCTION public.sync_user_to_club_members()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if critical fields changed
    -- FIX: Use NEW.full_name directly.
    IF (NEW.phone IS DISTINCT FROM OLD.phone) OR 
       (NEW.full_name IS DISTINCT FROM OLD.full_name) OR 
       (NEW.email IS DISTINCT FROM OLD.email) THEN
       
       -- Propagate to all club memberships
       UPDATE public.club_members
       SET 
         phone = COALESCE(NEW.phone, phone),
         full_name = COALESCE(NEW.full_name, full_name),
         email = NEW.email,
         updated_at = NOW()
       WHERE user_id = NEW.id;
       
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
