-- Replace 'YOUR_EMAIL_HERE' with the email of the user you want to make Admin
-- Example: 'lalo@olimpo.com'

DO $$
DECLARE
  target_email TEXT := 'YOUR_EMAIL_HERE';
BEGIN
  -- 1. Update public.users table (for database logic / RLS)
  UPDATE public.users
  SET role = 'admin'
  WHERE email = target_email;

  -- 2. Update auth.users metadata (for Frontend UI access)
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN '{"role": "admin"}'::jsonb
      ELSE jsonb_set(raw_user_meta_data, '{role}', '"admin"')
    END
  WHERE email = target_email;

END $$;
