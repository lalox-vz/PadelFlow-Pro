-- 1. Fix Check Constraints on Users Role to allow new roles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('owner', 'club_owner', 'academy_owner', 'coach', 'student', 'player', 'admin', 'super_admin', 'client'));

-- 2. Update Default Role to 'player'
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'player';

-- 3. Migrate legacy 'student' users to 'player'
UPDATE public.users SET role = 'player' WHERE role = 'student';

-- 4. Fix Foreign Key for Organization ID (Drop Legacy Constraint pointing to public.organizations)
-- This allows organization_id to store IDs from the new public.entities table
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_organization_id_fkey;

-- 5. Update Trigger Function to use 'player' default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data ->> 'full_name', 
    'player', -- Updated default to player
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
