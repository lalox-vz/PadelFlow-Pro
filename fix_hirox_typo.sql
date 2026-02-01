-- Fix spelling of 'Hirox' to 'Hyrox' in historical data

-- 1. Update Trainings table
-- Some trainings might have 'Hirox' stored in the 'type' text column
UPDATE public.trainings
SET type = 'Hyrox'
WHERE type = 'Hirox';

-- 2. Update Coaches table
-- Coaches have a 'specialties' column which is a text array (text[])
-- We need to replace any occurrence of 'Hirox' with 'Hyrox' inside that array.
-- We can use array_replace function for this.

UPDATE public.coaches
SET specialties = array_replace(specialties, 'Hirox', 'Hyrox')
WHERE 'Hirox' = ANY(specialties);

-- Also update the legacy 'specialty' column if it exists and matches
UPDATE public.coaches
SET specialty = 'Hyrox'
WHERE specialty = 'Hirox';
