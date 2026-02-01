-- Add court_ids array column to pricing_rules to allow specific court targeting
-- If empty or null, we can assume it applies to ALL courts (or enforce explicit 'all').
-- Let's stick to: If null/empty -> Applies to ALL courts (backward compatibility). 
-- If populated -> Applies ONLY to those court IDs.

ALTER TABLE public.pricing_rules 
ADD COLUMN IF NOT EXISTS court_ids UUID[] DEFAULT NULL;
