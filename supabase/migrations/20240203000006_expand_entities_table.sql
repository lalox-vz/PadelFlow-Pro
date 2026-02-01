-- Migration to expand entities table with direct columns
-- replacing the legacy JSON 'details' dependency.

ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS default_duration INTEGER DEFAULT 90;
ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS cancellation_window INTEGER DEFAULT 24;
ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER DEFAULT 14;

COMMENT ON COLUMN public.entities.address IS 'Physical address of the organization';
COMMENT ON COLUMN public.entities.default_duration IS 'Default booking duration in minutes';
