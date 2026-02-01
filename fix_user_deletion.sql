-- FIX USER DELETION CASCADES
-- Run this in your Supabase SQL Editor

BEGIN;

-- 1. public.users -> auth.users
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users
ADD CONSTRAINT users_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 2. public.registrations -> public.users
ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_user_id_fkey;

ALTER TABLE public.registrations
ADD CONSTRAINT registrations_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- 3. public.payments -> public.users
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

ALTER TABLE public.payments
ADD CONSTRAINT payments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- 4. public.notifications -> public.users
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- 5. public.waitlists -> public.users (If exists)
-- We use a DO block to avoid errors if table doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waitlists') THEN
        ALTER TABLE public.waitlists DROP CONSTRAINT IF EXISTS waitlists_user_id_fkey;
        ALTER TABLE public.waitlists ADD CONSTRAINT waitlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
