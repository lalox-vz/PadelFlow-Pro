
-- Run this in Supabase SQL Editor to promote a user to Super Admin

-- REPLACE 'YOUR_EMAIL@EXAMPLE.COM' WITH THE ACTUAL EMAIL
update auth.users
set raw_app_meta_data = 
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "super_admin"}'::jsonb
where email = 'YOUR_EMAIL@EXAMPLE.COM';

-- Verify
select email, raw_app_meta_data from auth.users where email = 'YOUR_EMAIL@EXAMPLE.COM';
