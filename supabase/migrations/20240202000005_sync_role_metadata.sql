-- ================================================
-- FINAL SECURITY FIX: Sync Public Role to Auth Metadata
-- ================================================

-- This trigger ensures that when we update a user's role in the public.users table
-- (e.g. via the Team page), it automatically updates the auth.users metadata.
-- This keeps the JWT and the database in sync.

CREATE OR REPLACE FUNCTION public.sync_user_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if role, organization, or business type changed
    IF (OLD.role IS DISTINCT FROM NEW.role) OR 
       (OLD.organization_id IS DISTINCT FROM NEW.organization_id) OR
       (OLD.business_type IS DISTINCT FROM NEW.business_type) THEN
        
        UPDATE auth.users
        SET raw_user_meta_data = 
            COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object(
                'role', NEW.role,
                'organization_id', NEW.organization_id,
                'business_type', NEW.business_type
            )
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Synced auth metadata for user %: role=%, org=%', NEW.id, NEW.role, NEW.organization_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid duplication
DROP TRIGGER IF EXISTS trigger_sync_user_role_to_auth ON public.users;

-- Create the trigger
CREATE TRIGGER trigger_sync_user_role_to_auth
    AFTER UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_role_to_auth();

-- Manual Sync for existing discrepancies
-- This runs once to fix any users currently out of sync
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM public.users LOOP
        UPDATE auth.users
        SET raw_user_meta_data = 
            COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object(
                'role', r.role,
                'organization_id', r.organization_id,
                'business_type', r.business_type
            )
        WHERE id = r.id;
    END LOOP;
END $$;
