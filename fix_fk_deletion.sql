-- Drop the existing foreign key constraint
-- We attempt to drop both potential names just in case
ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_training_id_fkey;

ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_class_id_fkey;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE public.registrations
ADD CONSTRAINT registrations_training_id_fkey
FOREIGN KEY (training_id)
REFERENCES public.trainings(id)
ON DELETE CASCADE;
