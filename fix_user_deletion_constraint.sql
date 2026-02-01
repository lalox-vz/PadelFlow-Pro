-- Fix user deletion by adding ON DELETE CASCADE to related tables

-- 1. Modify 'registrations' table
-- Drop the existing strict constraint
ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_user_id_fkey;

-- Re-add it with CASCADE
ALTER TABLE public.registrations
ADD CONSTRAINT registrations_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- 2. Modify 'notifications' table (Recommended for clean cleanup)
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;
