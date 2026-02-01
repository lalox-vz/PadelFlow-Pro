-- 1. DELETE ORPHANS: Remove users from public.users that don't exist in auth.users
-- This ensures clean state before adding constraints
DELETE FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users);

-- 2. ENABLE CASCADE ON USERS TABLE
-- Drop existing constraint if it exists (assuming standard naming 'users_id_fkey')
-- You might need to check your exact constraint name if this fails.
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Add new constraint with ON DELETE CASCADE
ALTER TABLE public.users
ADD CONSTRAINT users_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 3. ENSURE CASCADE ON RELATED TABLES
-- This ensures that when a user is deleted, their data is also removed prevents orphans.

-- REGISTRATIONS
ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_user_id_fkey;

ALTER TABLE public.registrations
ADD CONSTRAINT registrations_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- PAYMENTS
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

ALTER TABLE public.payments
ADD CONSTRAINT payments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- NOTIFICATIONS
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- PAYMENT PROOFS (Storage objects)
-- Note: Storage buckets cascading is handled separately or via triggers,
-- but cleaning up the database references here requires the tables above.
