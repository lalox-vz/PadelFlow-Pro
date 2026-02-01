-- Convert specialty to specialties array
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}';

-- Migrate existing data
UPDATE public.coaches 
SET specialties = ARRAY[specialty] 
WHERE specialty IS NOT NULL AND (specialties IS NULL OR specialties = '{}');

-- We can drop the old column later, or ignore it.
